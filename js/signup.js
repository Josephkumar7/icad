// FileName: /I-cad/js/signup.js

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('signup-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const role = document.getElementById('signup-role').value;
    const errorElem = document.getElementById('signup-error');

    if (!role) {
      errorElem.textContent = "Please select a role.";
      return;
    }

    auth.createUserWithEmailAndPassword(email, password)
      .then((userCredential) => {
        // Save user role and username in Firestore
        return db.collection('users').doc(userCredential.user.uid).set({
          username: username,
          email: email,
          role: role // This will be 'student' or 'teacher'
        });
      })
      .then(() => {
        alert("Account created successfully! Please log in.");
        window.location.href = "login.html"; // Redirect to login page after successful signup
      })
      .catch((error) => {
        errorElem.textContent = error.message;
        console.error("Signup Error:", error);
      });
  });
});
