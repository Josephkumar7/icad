document.addEventListener('DOMContentLoaded', function () {
  const profileEmailSpan = document.getElementById('profile-email');
  const profileRoleSpan = document.getElementById('profile-role');
  const profileUsernameSpan = document.getElementById('profile-username');
  const userDisplayNameSpan = document.getElementById('user-display-name');
  const logoutBtn = document.getElementById('logout-btn');
  const badgeCountElem = document.getElementById('badge-count');
  const badgesListElem = document.getElementById('badges-list');
  const coinCountElem = document.getElementById('coin-count');
  const dashboardLink = document.getElementById('dashboard-link');
  const coinsLeaderboardBody = document.getElementById('coins-leaderboard-body');

  auth.onAuthStateChanged((user) => {
    if (user) {
      db.collection('users')
        .doc(user.uid)
        .get()
        .then((userDoc) => {
          if (userDoc.exists) {
            const userData = userDoc.data();
            profileEmailSpan.textContent = user.email;
            profileRoleSpan.textContent = userData.role
              ? userData.role.charAt(0).toUpperCase() + userData.role.slice(1)
              : 'N/A';
            profileUsernameSpan.textContent = userData.username || 'N/A';
            userDisplayNameSpan.textContent = userData.username || 'User';

            // Load user coins count from combined quizScores and commentedLessons
            loadUserCoinsCombined(user.uid);

            // Load overall leaderboard by total coins
            loadCoinsLeaderboard();

            // Set dashboard link based on role
            if (userData.role === "teacher") {
              dashboardLink.href = "teacher-dashboard.html";
            } else {
              dashboardLink.href = "student-dashboard.html";
            }

            // Hide sections for teachers
            if (userData.role === "teacher") {
              const badgesSection = document.getElementById('badges-section');
              const pointsSection = document.getElementById('points-section');
              const coinsSection = document.getElementById('coins-section');
              if (badgesSection) badgesSection.style.display = 'none';
              if (pointsSection) pointsSection.style.display = 'none';
              if (coinsSection) coinsSection.style.display = 'none';
            } else {
              loadUserBadges(user.uid);
              loadUserPoints(user.uid);
            }
          } else {
            profileEmailSpan.textContent = user.email;
            profileRoleSpan.textContent = 'Unknown';
            profileUsernameSpan.textContent = 'N/A';
            userDisplayNameSpan.textContent = 'User';
            badgeCountElem.textContent = 'No badges earned yet.';
            coinCountElem.textContent = '0';
          }
        })
        .catch((error) => {
          console.error('Error fetching user data:', error);
          profileEmailSpan.textContent = user.email;
          profileRoleSpan.textContent = 'Error';
          profileUsernameSpan.textContent = 'N/A';
          userDisplayNameSpan.textContent = 'User';
          badgeCountElem.textContent = 'Error loading badges.';
          coinCountElem.textContent = 'Error loading coins.';
        });
    } else {
      window.location.href = 'login.html';
    }
  });

  function loadCoinsLeaderboard() {
    const leaderboardRef = realtimeDb.ref('leaderboard');

    leaderboardRef.orderByChild('totalCoins').limitToLast(5).on('value', snapshot => {
      if (!snapshot.exists()) {
        coinsLeaderboardBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">NA</td></tr>';
        console.log('Coins leaderboard: No data available.');
        return;
      }

      const leaderboardData = [];
      snapshot.forEach(childSnapshot => {
        leaderboardData.push(childSnapshot.val());
      });

      // Sort descending by totalCoins
      leaderboardData.sort((a, b) => b.totalCoins - a.totalCoins);

      let rank = 1;
      coinsLeaderboardBody.innerHTML = '';

      leaderboardData.forEach(data => {
        const username = data.username || data.email || 'Unknown';
        const coins = data.totalCoins || 0;

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="border: 1px solid #ddd; padding: 6px;">${rank}</td>
          <td style="border: 1px solid #ddd; padding: 6px;">${username}</td>
          <td style="border: 1px solid #ddd; padding: 6px;">${coins}</td>
        `;

        coinsLeaderboardBody.appendChild(tr);
        rank++;
      });
      console.log('Coins leaderboard loaded successfully (Realtime Database).');
    }, error => {
      console.error('Error loading coins leaderboard:', error);
      coinsLeaderboardBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Error loading leaderboard.</td></tr>';
    });
  }

  // Load user coins count from combined quizScores and commentedLessons
  function loadUserCoinsCombined(userId) {
    const db = firebase.firestore();
    let totalCoins = 0;

    // Get quiz scores coins
    db.collection('users').doc(userId).collection('quizScores').get()
      .then(quizSnapshot => {
        quizSnapshot.forEach(doc => {
          const data = doc.data();
          totalCoins += data.score || 0;
        });

        // Get comment coins
        db.collection('users').doc(userId).collection('commentedLessons').get()
          .then(commentSnapshot => {
            totalCoins += commentSnapshot.size;

            // Update coin count display
            document.getElementById('coin-count').textContent = totalCoins;
          })
          .catch(error => {
            console.error('Error loading comment coins:', error);
            document.getElementById('coin-count').textContent = 'Error loading coins.';
          });
      })
      .catch(error => {
        console.error('Error loading quiz scores:', error);
        document.getElementById('coin-count').textContent = 'Error loading coins.';
      });
  }

  // Load badges
  function loadUserBadges(userId) {
    db.collection('users')
      .doc(userId)
      .collection('completedCourses')
      .get()
      .then((snapshot) => {
        if (snapshot.empty) {
          badgeCountElem.textContent = 'No badges earned yet.';
          return;
        }

        const badges = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          badges.push({
            courseId: doc.id,
            badgeAwarded: data.badgeAwarded,
            completedAt: data.completedAt ? data.completedAt.toDate().toLocaleDateString() : 'N/A',
          });
        });

        badgeCountElem.textContent = `Badges Earned: ${badges.length}`;
        badgesListElem.innerHTML = '';

        badges.forEach((badge) => {
          const badgeCard = document.createElement('div');
          badgeCard.className = 'badge-card';
          badgeCard.style.border = '1px solid #ffd700';
          badgeCard.style.borderRadius = '8px';
          badgeCard.style.padding = '15px';
          badgeCard.style.backgroundColor = '#fffbea';
          badgeCard.style.width = '200px';
          badgeCard.style.boxShadow = '0 2px 6px rgba(255, 215, 0, 0.3)';
          badgeCard.style.display = 'flex';
          badgeCard.style.flexDirection = 'column';
          badgeCard.style.alignItems = 'center';

          const badgeIcon = document.createElement('div');
          badgeIcon.innerHTML = '🏅';
          badgeIcon.style.fontSize = '3rem';
          badgeIcon.style.marginBottom = '10px';

          const courseIdText = document.createElement('p');
          courseIdText.textContent = `Course ID: ${badge.courseId}`;
          courseIdText.style.fontWeight = 'bold';
          courseIdText.style.marginBottom = '5px';

          const completedAtText = document.createElement('p');
          completedAtText.textContent = `Completed: ${badge.completedAt}`;
          completedAtText.style.fontSize = '0.9rem';
          completedAtText.style.color = '#555';

          badgeCard.appendChild(badgeIcon);
          badgeCard.appendChild(courseIdText);
          badgeCard.appendChild(completedAtText);
          badgesListElem.appendChild(badgeCard);
        });
      })
      .catch((error) => {
        console.error('Error loading badges:', error);
        badgeCountElem.textContent = 'Error loading badges.';
      });
  }

  // Load points
  function loadUserPoints(userId) {
    db.collection('users').doc(userId).get()
      .then(doc => {
        if (doc.exists) {
          const data = doc.data();
          document.getElementById('points-total').textContent = data.points || 0;
        } else {
          document.getElementById('points-total').textContent = 0;
        }
      })
      .catch(error => {
        console.error('Error loading points:', error);
        document.getElementById('points-total').textContent = 'Error loading points.';
      });
  }

  // Logout button handler
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function (e) {
      e.preventDefault();
      auth.signOut().then(() => {
        window.location.href = 'login.html';
      }).catch((error) => {
        console.error('Logout Error:', error);
        alert('Error logging out: ' + error.message);
      });
    });
  }
});
