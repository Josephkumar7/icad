// FileName: /I-cad/js/login.js

document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('login-form');
  const loginErrorElem = document.getElementById('login-error');

  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault(); // Prevent default form submission
      loginErrorElem.textContent = ""; // Clear previous errors

      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;

      auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
          // User successfully signed in
          const user = userCredential.user;
          // Fetch user role from Firestore
          return db.collection('users').doc(user.uid).get();
        })
        .then(userDoc => {
          if (userDoc.exists) {
            const userData = userDoc.data();
            const role = userData.role;

            // Redirect based on role
            if (role === "teacher") {
              window.location.href = "teacher-dashboard.html";
            } else if (role === "student") {
              window.location.href = "student-dashboard.html";
            } else {
              loginErrorElem.textContent = "Error: Unknown user role.";
              console.error("Unknown role:", role);
              auth.signOut(); // Log out user with unknown role
            }
          } else {
            loginErrorElem.textContent = "Error: User data not found in Firestore.";
            console.error("User document does not exist for UID:", userCredential.user.uid);
            auth.signOut(); // Log out user if their data isn't found
          }
        })
        .catch((error) => {
          // Handle login errors
          let errorMessage = "Login failed. Please check your credentials.";
          if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMessage = "Invalid email or password.";
          } else if (error.code === 'auth/invalid-email') {
            errorMessage = "Invalid email format.";
          }
          loginErrorElem.textContent = errorMessage;
          console.error("Login Error:", error);
        });
    });
  }

  // Forgot Password functionality
  const forgotPasswordLink = document.getElementById('forgot-password-link');
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', function(e) {
      e.preventDefault();
      loginErrorElem.textContent = ""; // Clear previous messages

      const email = prompt("Please enter your email address for password reset:");

      if (email) {
        auth.sendPasswordResetEmail(email)
          .then(() => {
            loginErrorElem.style.color = "green";
            loginErrorElem.textContent = "Password reset email sent. Please check your inbox.";
          })
          .catch((error) => {
            loginErrorElem.style.color = "crimson";
            loginErrorElem.textContent = "Error sending password reset email: " + error.message;
            console.error("Password Reset Error:", error);
          });
      } else {
        loginErrorElem.style.color = "crimson";
        loginErrorElem.textContent = "Please enter a valid email address to reset your password.";
      }
    });
  }
});
