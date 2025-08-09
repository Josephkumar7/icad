document.addEventListener('DOMContentLoaded', function () {
  const scoreMessage = document.getElementById('score-message');
  const leaderboardBody = document.getElementById('leaderboard-body');
  const backBtn = document.getElementById('back-btn');

  // Parse query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const courseId = urlParams.get('courseId');
  const lessonId = urlParams.get('lessonId');
  const score = parseInt(urlParams.get('score'), 10);
  const total = parseInt(urlParams.get('total'), 10);

  if (!courseId || !lessonId || isNaN(score) || isNaN(total)) {
    scoreMessage.textContent = 'Invalid quiz result data.';
    return;
  }

  scoreMessage.textContent = `You answered ${score} out of ${total} questions correctly.`;

  // Fetch leaderboard data for this quiz
  // Leaderboard is based on users/{userId}/quizScores/{lessonId} documents
  const db = firebase.firestore();

  db.collectionGroup('quizScores')
    .where('lessonId', '==', lessonId)
    .orderBy('score', 'desc')
    .limit(10)
    .get()
    .then(snapshot => {
      if (snapshot.empty) {
        leaderboardBody.innerHTML = '<tr><td colspan="3">No attempts yet.</td></tr>';
        return;
      }

      // Collect user scores
      const scores = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        scores.push({
          userId: doc.ref.parent.parent.id,
          score: data.score,
          quizTitle: data.quizTitle || '',
        });
      });

      // Fetch user names for the top scores
      const userIds = scores.map(s => s.userId);
      const userPromises = userIds.map(uid => db.collection('users').doc(uid).get());

      Promise.all(userPromises).then(userDocs => {
        const usersMap = {};
        userDocs.forEach(userDoc => {
          if (userDoc.exists) {
            usersMap[userDoc.id] = userDoc.data().username || userDoc.data().email || 'Unknown';
          }
        });

        // Render leaderboard rows
        leaderboardBody.innerHTML = '';
        scores.forEach((entry, index) => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${usersMap[entry.userId] || 'Unknown'}</td>
            <td>${entry.score}</td>
          `;
          leaderboardBody.appendChild(tr);
        });
      });
    })
    .catch(error => {
      console.error('Error fetching leaderboard:', error);
      leaderboardBody.innerHTML = `<tr><td colspan="3">Error loading leaderboard.</td></tr>`;
      alert('Error loading leaderboard: ' + error.message);
    });

  backBtn.addEventListener('click', () => {
    if (courseId && lessonId) {
      window.location.href = `lesson-detail.html?courseId=${courseId}&lessonId=${lessonId}`;
    } else if (courseId) {
      window.location.href = `course-detail.html?id=${courseId}`;
    } else {
      window.location.href = 'student-dashboard.html';
    }
  });

  // New code to update leaderboard in Realtime Database and Firestore totalCoins on quiz completion
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      // Update Firestore user quizScores collection
      db.collection('users').doc(user.uid).collection('quizScores').add({
        score: score,
        lessonId: lessonId,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      }).then(() => {
        console.log('Quiz score saved to Firestore.');

        // After saving to Firestore, update totalCoins in Firestore user doc
        db.collection('users').doc(user.uid).get().then(userDoc => {
          if (userDoc.exists) {
            const userData = userDoc.data();
            const currentTotalCoins = userData.totalCoins || 0;
            const newTotalCoins = currentTotalCoins + score;

            // Update totalCoins in Firestore
            db.collection('users').doc(user.uid).update({
              totalCoins: newTotalCoins
            }).then(() => {
              console.log('User totalCoins updated in Firestore:', newTotalCoins);

              // Also update leaderboard in Realtime Database
              const realtimeDb = firebase.database();
              const userRef = realtimeDb.ref('leaderboard/' + user.uid);

              const usernameToSet = userData.username && userData.username.trim() !== '' ? userData.username : user.email;

              userRef.set({
                username: usernameToSet,
                totalCoins: newTotalCoins
              }).then(() => {
                console.log('Leaderboard updated in Realtime Database.');
              }).catch(error => {
                console.error('Error updating leaderboard:', error);
                alert('Error updating leaderboard: ' + error.message);
              });
            }).catch(error => {
              console.error('Error updating totalCoins in Firestore:', error);
            });
          }
        }).catch(error => {
          console.error('Error fetching user data for totalCoins update:', error);
        });
      }).catch(error => {
        console.error('Error saving quiz score:', error);
      });
    } else {
      alert('User not logged in.');
    }
  });
});
