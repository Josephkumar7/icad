// FileName: /I-cad/js/course-detail.js

document.addEventListener('DOMContentLoaded', function() {
  const courseTitleDisplay = document.getElementById('course-title-display');
  const courseInstructorDisplay = document.getElementById('course-instructor-display');
  const courseEnrolledDateDisplay = document.getElementById('course-enrolled-date-display');
  const courseDescriptionDisplay = document.getElementById('course-description-display');
  const lessonsListStudent = document.getElementById('lessons-list-student');
  const courseDetailError = document.getElementById('course-detail-error');
  const pageTitle = document.getElementById('page-title');

  let currentUserId = null;
  let courseId = null; // This will store the current course ID

  // Authentication Guard
  auth.onAuthStateChanged(user => {
    if (user) {
      currentUserId = user.uid;
      db.collection('users').doc(user.uid).get().then(userDoc => {
        if (userDoc.exists && userDoc.data().role === "student") {
          // User is a student, proceed
          const urlParams = new URLSearchParams(window.location.search);
          courseId = urlParams.get('id') || urlParams.get('courseId'); // Accept both ?id=... and ?courseId=...

          if (courseId) {
            loadCourseDetails(courseId, currentUserId);
          } else {
            courseDetailError.textContent = "Error: Course ID not provided.";
            lessonsListStudent.innerHTML = "<p class='empty-state'>No course selected to view.</p>";
          }
        } else {
          // User is logged in but not a student, or role data is missing
          alert("Access Denied: You are not authorized to view course details.");
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

  // Logout button handler
  document.getElementById('logout-btn').addEventListener('click', function(e) {
    e.preventDefault();
    auth.signOut().then(() => {
      window.location.href = "login.html";
    }).catch((error) => {
      console.error("Logout Error:", error);
      alert("Error logging out: " + error.message);
    });
  });

  function loadCourseDetails(courseId, userId) {
    // Fetch course details
    db.collection('courses').doc(courseId).get()
      .then(courseDoc => {
        if (courseDoc.exists) {
          const course = courseDoc.data();
          courseTitleDisplay.textContent = course.name || 'Untitled Course';
          pageTitle.textContent = `${course.name} | I-Cad Portal`; // Update browser tab title
          courseInstructorDisplay.textContent = course.instructorName || 'N/A';
          courseDescriptionDisplay.textContent = course.description || 'No description provided.';

          // Check enrollment status and display enrolled date
          return db.collection('users').doc(userId).collection('enrolledCourses').doc(courseId).get()
            .then(enrolledDoc => {
              if (enrolledDoc.exists) {
                const enrolledData = enrolledDoc.data();
                const enrolledAt = enrolledData.enrolledAt ? enrolledData.enrolledAt.toDate().toLocaleDateString() : 'N/A';
                courseEnrolledDateDisplay.textContent = enrolledAt;
              } else {
                courseEnrolledDateDisplay.textContent = 'Not Enrolled';
                // Optionally, you could redirect or show a message if not enrolled
                // alert("You are not enrolled in this course. Please enroll first.");
                // window.location.href = "student-dashboard.html";
              }
              // Load lessons regardless of enrollment status, but maybe restrict content later
              loadLessonsForCourse(courseId);
            });
        } else {
          courseDetailError.textContent = "Course not found.";
          lessonsListStudent.innerHTML = "<p class='empty-state'>Course details could not be loaded.</p>";
        }
      })
      .catch(error => {
        console.error("Error loading course details:", error);
        courseDetailError.textContent = "Error loading course details: " + error.message;
        lessonsListStudent.innerHTML = "<p class='empty-state'>Error loading course details.</p>";
      });
  }

  function loadLessonsForCourse(courseId) {
    lessonsListStudent.innerHTML = "<p class='empty-state'>Loading lessons...</p>";
    db.collection('courses').doc(courseId).collection('lessons')
      .orderBy('createdAt', 'asc')
      .get()
      .then(snapshot => {
        lessonsListStudent.innerHTML = "";
        if (snapshot.empty) {
          lessonsListStudent.innerHTML = "<p class='empty-state'>No lessons available for this course yet.</p>";
          return;
        }
        snapshot.forEach(doc => {
          const lesson = doc.data();
          const lessonItem = document.createElement('div');
          lessonItem.className = 'lesson-item';

          // Create checkbox element
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.id = `completed-${doc.id}`;
          checkbox.style.marginRight = '10px';

          // Create label for checkbox
          const label = document.createElement('label');
          label.htmlFor = checkbox.id;

          // Create lesson link
          const lessonLink = document.createElement('a');
          lessonLink.href = `lesson-detail.html?courseId=${courseId}&lessonId=${doc.id}`;
          lessonLink.textContent = lesson.title || 'Untitled Lesson';

          // Create h4 element and append checkbox, label, and link
          const h4 = document.createElement('h4');
          h4.style.display = 'flex';
          h4.style.alignItems = 'center';

          h4.appendChild(checkbox);
          h4.appendChild(label);
          h4.appendChild(lessonLink);

          lessonItem.appendChild(h4);
          lessonsListStudent.appendChild(lessonItem);

          // Load completion status for this lesson and set checkbox
          db.collection('users').doc(currentUserId).collection('completedLessons').doc(doc.id).get()
            .then(docSnap => {
              if (docSnap.exists) {
                const data = docSnap.data();
                checkbox.checked = data.completed === true;
              } else {
                checkbox.checked = false;
              }
            })
            .catch(error => {
              console.error("Error loading lesson completion status:", error);
            });

          // Add event listener to checkbox to save completion status
          checkbox.addEventListener('change', function() {
            const completed = checkbox.checked;
            db.collection('users').doc(currentUserId).collection('completedLessons').doc(doc.id).set({
              courseId: courseId,
              completed: completed,
              timestamp: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
              if (completed) {
                // Check if all lessons completed to award badge
                checkAndMarkCourseCompletion(currentUserId, courseId);
              }
            })
            .catch(error => {
              console.error("Error saving lesson completion status:", error);
              alert("Error saving completion status: " + error.message);
              checkbox.checked = !completed; // revert
            });
          });
        });
      })
      .catch(error => {
        console.error("Error loading lessons:", error);
        lessonsListStudent.innerHTML = `<p class='error-message'>Error loading lessons: ${error.message}</p>`;
      });

  // Check if all lessons in course are completed, then mark course completed and award badge
  function checkAndMarkCourseCompletion(userId, courseId) {
    db.collection('courses').doc(courseId).collection('lessons').get()
      .then(lessonsSnapshot => {
        const totalLessons = lessonsSnapshot.size;
        if (totalLessons === 0) return;

        db.collection('users').doc(userId).collection('completedLessons')
          .where('courseId', '==', courseId)
          .where('completed', '==', true)
          .get()
          .then(completedLessonsSnapshot => {
            const completedCount = completedLessonsSnapshot.size;
            if (completedCount === totalLessons) {
              // Mark course as completed and award badge
              db.collection('users').doc(userId).collection('completedCourses').doc(courseId).set({
                badgeAwarded: true,
                completedAt: firebase.firestore.FieldValue.serverTimestamp()
              })
              .then(() => {
                alert("Congratulations! You have completed the course and earned a badge.");
              })
              .catch(error => {
                console.error("Error awarding badge:", error);
              });
            }
          })
          .catch(error => {
            console.error("Error checking completed lessons:", error);
          });
      })
      .catch(error => {
        console.error("Error fetching lessons for course:", error);
      });
  }
  }
});
// End of course-detail.js