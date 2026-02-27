    /* --- CONFIGURATION --- */
    const EXAM_DURATION = .5 * 60; 
    const WARNING_TIME = .3 * 60;   
    const GRACE_DURATION = .3 * 60; 
    const COOLDOWN_DURATION = .5 * 60; 
    const MAIN_KEY = 'lg_1exam_main_timer';
    const GRACE_KEY = 'lg_1exam_grace_timer';
    const NAME_KEY = 'lg_1exam_user_name'; // Key for stored name

    const API_URL = "";
    /* --------------------- */
    
    function safeGet(key) { try { return localStorage.getItem(key); } catch(e) { return null; } }
    function safeSet(key,val) { try { localStorage.setItem(key,val); } catch(e) { } }
    function safeRemove(key) { try { localStorage.removeItem(key); } catch(e) { } }

    let mainStart = safeGet(MAIN_KEY);
    let graceStart = safeGet(GRACE_KEY);
    let storedName = safeGet(NAME_KEY);
    let hasWarned = false;

    // --- ANTI-CHEAT LISTENERS ---
    function triggerCheatWarning() {
        if (document.getElementById('exam-interface').style.display === 'block') {
            document.getElementById('cheat-warning').style.display = 'flex';
        }
    }

    document.addEventListener('visibilitychange', function() { if (document.hidden) triggerCheatWarning(); });
    document.addEventListener('mouseleave', triggerCheatWarning);
    document.addEventListener("keydown", function (e) {
        if ((e.ctrlKey || e.metaKey) && ['s','S','p','P'].includes(e.key)) { e.preventDefault(); triggerCheatWarning(); }
        if (e.ctrlKey && e.shiftKey && (e.key === 's' || e.key === 'S')) { e.preventDefault(); triggerCheatWarning(); }
    });
    document.addEventListener("keyup", function (e) {
        if (e.key === "PrintScreen" || e.keyCode === 44) {
            try { navigator.clipboard.writeText("⚠️ Screenshots prohibited."); } catch(err) {}
            triggerCheatWarning();
        }
    });
    document.addEventListener('touchstart', function(e) { if (e.touches.length >= 3) triggerCheatWarning(); }, { passive: true });
    document.addEventListener('touchmove', function(e) { if (e.touches.length >= 3) triggerCheatWarning(); }, { passive: true });

    // --- TIMER SYSTEM ---
    setInterval(systemCheck, 1000); 
    systemCheck(); 

    function systemCheck() {
      const pred = document.getElementById('predicted-end');
      if(pred && document.getElementById('start-screen').style.display !== 'none') {
          pred.textContent = new Date(Date.now() + EXAM_DURATION * 1000).toLocaleTimeString([], {hour: 'numeric',minute:'2-digit'});
      }

      if (graceStart) {
          let rem = GRACE_DURATION - Math.floor((Date.now() - graceStart) / 1000);
          if (rem > 0) {
              showUI('exam-interface');
              let mins = Math.floor(rem / 60); let secs = rem % 60;
              document.getElementById('timer').textContent = `SUBMIT NOW 0${mins}:${secs < 10 ? '0' : ''}${secs}`;
          } else if (rem > -COOLDOWN_DURATION) { 
              showUI('expired-msg');
              autoFetchResult(); // Trigger auto-fetch
          } 
          else { resetSystem(); }
      } 
      else if (mainStart) {
          let rem = EXAM_DURATION - Math.floor((Date.now() - mainStart) / 1000);
          if (rem > 0) {
              showUI('exam-interface');
              if (rem <= WARNING_TIME && !hasWarned) { document.getElementById('warning-modal').style.display = "flex"; hasWarned = true; }
              let mins = Math.floor(rem / 60); let secs = rem % 60;
              document.getElementById('timer').textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
          } else if (rem > -GRACE_DURATION) { showUI('continue-screen'); } 
          else if (rem > -(GRACE_DURATION + COOLDOWN_DURATION)) { 
              showUI('expired-msg'); 
              autoFetchResult(); // Trigger auto-fetch
          } 
          else { resetSystem(); }
      }
    }

    function startExam() { 
        const nameVal = document.getElementById('userNameInput').value.trim();
        if(!nameVal) { alert("Please enter your name to begin."); return; }
        storedName = nameVal;
        safeSet(NAME_KEY, nameVal);
        mainStart = Date.now(); 
        safeSet(MAIN_KEY,mainStart); 
        systemCheck(); 
    }
    
    function startGracePeriod() { graceStart = Date.now(); safeSet(GRACE_KEY,graceStart); systemCheck(); }
    
    function manualSubmitFinish() {
      if (confirm("⚠️ VIEW RESULTS ⚠️\n\nEnsure you clicked SUBMIT on the Google Form first! Continue to results?")) {
          graceStart = Date.now() - (GRACE_DURATION * 1000) - 1000; 
          safeSet(GRACE_KEY, graceStart);
          systemCheck(); 
      }
    }

    function showUI(id) {
        ['start-screen', 'continue-screen', 'exam-interface', 'expired-msg'].forEach(el => {
            document.getElementById(el).style.display = (el === id) ? (id==='continue-screen'?'flex':'block') : 'none';
        });
    }

    function resetSystem() {
      safeRemove(MAIN_KEY); safeRemove(GRACE_KEY); safeRemove(NAME_KEY);
      mainStart = null; graceStart = null; storedName = null; hasWarned = false;
      document.getElementById('timer').textContent = "45:00";
      showUI('start-screen');
    }

    // --- AUTO RESULT FETCHER ---
    let fetchStarted = false;
    function autoFetchResult() {
      if (fetchStarted || !storedName) return;
      fetchStarted = true;
      
      const resultDiv = document.getElementById('scoreDisplayResult');
      document.getElementById('statusHeader').textContent = "Retrieving Results...";
      document.getElementById('statusSubtext').textContent = "Searching for: " + storedName;
      resultDiv.innerHTML = "<i>Connecting to database...</i>";
      
      // Delay search by 3 seconds to give Google Sheet time to sync
      setTimeout(() => {
        fetch(API_URL + "?name=" + encodeURIComponent(storedName))
          .then(res => res.json())
          .then(data => {
              if (data.found) { 
                  document.getElementById('statusHeader').textContent = "Exam Result";
                  let remarkColor = (data.remark === "PASSED") ? "#2e7d32" : "#fd312e";
                  resultDiv.innerHTML = `
                      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #ddd; margin-top: 15px;">
                          <p style="margin: 0 0 10px 0; font-size: 16px; color: #333;">Score: <b>${data.score}</b></p>
                          <p style="margin: 0; font-size: 18px; color: ${remarkColor};">Remark: <b>${data.remark}</b></p>
                      </div>
                  `; 
              } else { 
                  resultDiv.innerHTML = "<p style='color:#fd312e;'>Result not found yet. Please wait a moment and refresh or search below.</p>";
              }
          })
          .catch(err => { resultDiv.innerHTML = "<p style='color:#fd312e;'>Error connecting to database.</p>"; });
      }, 3000);
    }

    // --- NEW: MANUAL RESULT FETCHER ---
    function manualFetchScore() {
        const nameInput = document.getElementById('manualSearchName').value.trim();
        const resultDiv = document.getElementById('scoreDisplayResult');
        
        if (!nameInput) {
            alert("Please enter a name to search.");
            return;
        }

        document.getElementById('statusHeader').textContent = "Retrieving Results...";
        document.getElementById('statusSubtext').textContent = "Searching for: " + nameInput;
        resultDiv.innerHTML = "<i>Connecting to database...</i>";

        fetch(API_URL + "?name=" + encodeURIComponent(nameInput))
          .then(res => res.json())
          .then(data => {
              if (data.found) { 
                  document.getElementById('statusHeader').textContent = "Exam Result";
                  let remarkColor = (data.remark === "PASSED") ? "#2e7d32" : "#fd312e";
                  resultDiv.innerHTML = `
                      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #ddd; margin-top: 15px;">
                          <p style="margin: 0 0 10px 0; font-size: 16px; color: #333;">Score: <b>${data.score}</b></p>
                          <p style="margin: 0; font-size: 18px; color: ${remarkColor};">Remark: <b>${data.remark}</b></p>
                      </div>
                  `; 
              } else { 
                  resultDiv.innerHTML = "<p style='color:#fd312e;'>Result not found. Check spelling or ensure you submitted.</p>";
              }
          })
          .catch(err => { resultDiv.innerHTML = "<p style='color:#fd312e;'>Error connecting to database.</p>"; });
    }
