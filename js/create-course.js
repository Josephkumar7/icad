// FileName: /I-cad/js/create-course.js

document.addEventListener('DOMContentLoaded', function() {
  const courseForm = document.getElementById('course-form');
  const courseIdField = document.getElementById('course-id');
  const formTitle = document.getElementById('form-title');
  const errorElem = document.getElementById('form-error');
  const thumbnailInput = document.getElementById('course-thumbnail');

  // Authentication Guard: Check if user is logged in and is a teacher
  auth.onAuthStateChanged(user => {
    if (user) {
      db.collection('users').doc(user.uid).get().then(userDoc => {
        if (userDoc.exists && userDoc.data().role === "teacher") {
          // User is a teacher, proceed with form setup
          const urlParams = new URLSearchParams(window.location.search);
          const courseId = urlParams.get('id');

          if (courseId) {
            formTitle.textContent = "Edit Course";
            courseIdField.value = courseId;
            // Fetch course data and populate form
            db.collection('courses').doc(courseId).get()
              .then(doc => {
                if (doc.exists) {
                  const course = doc.data();
                  document.getElementById('course-name').value = course.name || '';
                  document.getElementById('course-description').value = course.description || '';
                  document.getElementById('course-instructor').value = course.instructorName || '';
                  document.getElementById('course-thumbnail').value = course.thumbnailUrl || '';
                } else {
                  errorElem.textContent = "Course not found.";
                }
              })
              .catch(error => {
                console.error("Error fetching course for edit:", error);
                errorElem.textContent = "Error loading course data: " + error.message;
              });
          }
        } else {
          // User is logged in but not a teacher, or role data is missing
          alert("Access Denied: You are not authorized to create/edit courses.");
          auth.signOut().then(() => {
            window.location.href = "login.html"; // Redirect to login
          });
        }
      }).catch(error => {
        console.error("Error fetching user role:", error);
        alert("Error checking user role. Please try again.");
        auth.signOut().then(() => {
          window.location.href = "login.html"; // Redirect to login
        });
      });
    } else {
      // Not logged in, redirect to login page
      window.location.href = "login.html";
    }
  });

  // Handle thumbnail file upload
  thumbnailInput.addEventListener('change', function() {
    const file = thumbnailInput.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const uploadUrl = 'https://nexapay.me/apps/icad/upload.php';

    fetch(uploadUrl, {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      if (data.url) {
        // Set the uploaded URL to the hidden input, not the file input
        const thumbnailUrlInput = document.getElementById('course-thumbnail-url');
        if (thumbnailUrlInput) {
          thumbnailUrlInput.value = data.url;
        }
        alert('Thumbnail uploaded successfully.');
      } else if (data.error) {
        alert('Thumbnail upload failed: ' + data.error);
      } else {
        alert('Thumbnail upload failed: Unknown error');
      }
    })
    .catch(error => {
      alert('Thumbnail upload failed: ' + error.message);
    });
  });

  // Logout button handler
  document.getElementById('logout-btn').addEventListener('click', function(e) {
    e.preventDefault(); // Prevent default button behavior
    auth.signOut().then(() => {
      window.location.href = "login.html";
    }).catch((error) => {
      console.error("Logout Error:", error);
      alert("Error logging out: " + error.message);
    });
  });

  courseForm.addEventListener('submit', function(e) {
    e.preventDefault();
    errorElem.textContent = "";

    const name = document.getElementById('course-name').value;
    const description = document.getElementById('course-description').value;
    const instructorName = document.getElementById('course-instructor').value;
    const thumbnailUrl = document.getElementById('course-thumbnail-url').value;
    const currentCourseId = courseIdField.value;

    auth.onAuthStateChanged(user => { // This inner onAuthStateChanged is redundant if the outer one handles auth guard
      if (user) {
        const teacherId = user.uid;
        const courseData = {
          name: name,
          description: description,
          instructorName: instructorName || user.email, // Default to user email if not provided
          thumbnailUrl: thumbnailUrl,
          teacherId: teacherId, // Link course to the teacher
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (currentCourseId) {
          // Update existing course
          db.collection('courses').doc(currentCourseId).update(courseData)
            .then(() => {
              alert("Course updated successfully!");
              window.location.href = "teacher-dashboard.html";
            })
            .catch(error => {
              console.error("Error updating course:", error);
              errorElem.textContent = "Error updating course: " + error.message;
            });
        } else {
          // Create new course
          db.collection('courses').add(courseData)
            .then(() => {
              alert("Course created successfully!");
              window.location.href = "teacher-dashboard.html";
            })
            .catch(error => {
              console.error("Error creating course:", error);
              errorElem.textContent = "Error creating course: " + error.message;
            });
        }
      } else {
        // This else block should ideally not be hit if the outer auth guard works
        errorElem.textContent = "You must be logged in to create/edit courses.";
        setTimeout(() => { window.location.href = "login.html"; }, 2000);
      }
    });
  });
});
