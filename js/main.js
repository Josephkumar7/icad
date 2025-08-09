// FileName: /I-cad/js/main.js

document.addEventListener('DOMContentLoaded', function() {
  const navLinksContainer = document.querySelector('header nav'); // Select the nav element itself

  auth.onAuthStateChanged(user => {
    if (user) {
      // User is logged in
      db.collection('users').doc(user.uid).get().then(userDoc => {
        if (userDoc.exists) {
          const userData = userDoc.data();
          const role = userData.role;
          let dashboardLink = '';
          let displayName = '';

          if (role === 'teacher') {
            dashboardLink = 'pages/teacher-dashboard.html';
            displayName = 'Teacher'; // Display "Teacher"
          } else if (role === 'student') {
            dashboardLink = 'pages/student-dashboard.html';
            displayName = 'Student'; // Display "Student"
          } else {
            displayName = 'User'; // Fallback for unknown role
          }

          // Update navigation links
          navLinksContainer.innerHTML = `
            <a href="index.html">Home</a>
            <a href="${dashboardLink}">Dashboard</a>
            <span id="user-display-name" class="user-display-name">${displayName}</span>
            <a href="pages/profile.html" id="profile-icon-link" class="profile-icon-link" aria-label="Profile">
                <img src="assets/profile-icon.png" alt="Profile" class="profile-icon">
            </a>
            <button type="button" id="logout-nav-btn" class="logout-btn" aria-label="Logout">Logout</button>
          `;

          document.getElementById('logout-nav-btn').addEventListener('click', function(e) {
            e.preventDefault();
            auth.signOut().then(() => {
              window.location.href = "index.html"; // Redirect to home after logout
            }).catch((error) => {
              console.error("Logout Error:", error);
              alert("Error logging out: " + error.message);
            });
          });

        } else {
          // User document not found, log out
          auth.signOut();
        }
      }).catch(error => {
        console.error("Error fetching user role:", error);
        auth.signOut();
      });
    } else {
      // No user is logged in
      navLinksContainer.innerHTML = `
        <a href="index.html">Home</a>
        <a href="pages/login.html">Login</a>
        <a href="pages/signup.html">Sign Up</a>
      `;
    }
  });
});
