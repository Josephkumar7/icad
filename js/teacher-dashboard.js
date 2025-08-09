// FileName: /I-cad/js/teacher-dashboard.js

document.addEventListener('DOMContentLoaded', function () {
  // Authentication Guard: Check if user is logged in and is a teacher
  auth.onAuthStateChanged(user => {
    if (user) {
      db.collection('users').doc(user.uid).get().then(userDoc => {
        if (userDoc.exists && userDoc.data().role === "teacher") {
          const teacherId = user.uid;
          loadTeacherCourses(teacherId, user);
        } else {
          // User is logged in but not a teacher, or role data is missing
          alert("Access Denied: You are not authorized to view this page.");
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

  // Add New Course button click
  document.getElementById('add-course-btn').addEventListener('click', function () {
    window.location.href = "create-course.html"; // Redirect to new course creation page
  });

  // Logout button click
  document.getElementById('logout-btn').addEventListener('click', function(e) {
    e.preventDefault(); // Prevent default button behavior
    auth.signOut().then(() => {
      window.location.href = "login.html"; // Redirect to login page after logout
    }).catch((error) => {
      console.error("Logout Error:", error);
      alert("Error logging out: " + error.message);
    });
  });
});

function loadTeacherCourses(teacherId, user) {
  const courseGrid = document.getElementById('course-grid');
  courseGrid.innerHTML = "<p>Loading your courses...</p>";

  db.collection('courses')
    .where('teacherId', '==', teacherId)
    .get()
    .then(snapshot => {
      courseGrid.innerHTML = ""; // Clear loading text
      if (snapshot.empty) {
        courseGrid.innerHTML = "<p>You haven't created any courses yet. Click 'Add New Course' to get started!</p>";
        return;
      }
      snapshot.forEach(doc => {
        const course = doc.data();
        const card = document.createElement('div');
        card.className = 'course-card';
        card.innerHTML = `
          <img src="${course.thumbnailUrl || '../assets/course-default.png'}" alt="Course Thumbnail" class="course-thumb">
          <div class="course-info">
            <h3 class="course-title">${course.name}</h3>
            <p class="course-instructor">Instructor: ${course.instructorName || (user.email || 'You')}</p>
            <button class="course-action-btn" onclick="editCourse('${doc.id}')">Edit</button>
            <button class="course-action-btn" style="background-color: #dc3545;" onclick="deleteCourse('${doc.id}', '${course.name}')">Delete</button>
            <button class="manage-lessons-btn" onclick="manageLessons('${doc.id}', '${course.name}')">Manage Lessons</button>
          </div>
        `;
        courseGrid.appendChild(card);
      });
    })
    .catch(error => {
      courseGrid.innerHTML = `<p style="color:crimson;">Error loading courses: ${error.message}</p>`;
    });
}

window.editCourse = function(courseId) {
  window.location.href = `create-course.html?id=${courseId}`; // Pass course ID for editing
};

window.deleteCourse = function(courseId, courseName) {
  if (confirm(`Are you sure you want to delete the course "${courseName}"? This action cannot be undone.`)) {
    db.collection('courses').doc(courseId).delete()
      .then(() => {
        alert(`Course "${courseName}" deleted successfully!`);
        // Reload courses after deletion
        auth.onAuthStateChanged(user => { // Re-check auth state to reload courses
          if (user) {
            loadTeacherCourses(user.uid, user);
          }
        });
      })
      .catch((error) => {
        console.error("Error deleting course:", error);
        alert("Error deleting course: " + error.message);
      });
  }
};

// Function to show lesson management section (called from teacher-dashboard.js)
window.manageLessons = function(courseId, courseName) {
  const lessonManagementSection = document.getElementById('lesson-management');
  const teacherCoursesSection = document.getElementById('teacher-courses-section');
  const currentCourseInfo = document.getElementById('current-course-info');

  lessonManagementSection.style.display = 'block'; // Show the section
  teacherCoursesSection.style.display = 'none'; // Hide the courses section
  currentCourseInfo.textContent = `Currently managing lessons for: ${courseName}`;

  // Call a function in teacher-lesson-management.js to load lessons
  if (typeof loadCourseLessons === 'function') {
    loadCourseLessons(courseId);
  } else {
    console.error("loadCourseLessons function not found in teacher-lesson-management.js");
    alert("Error: Lesson management script not fully loaded.");
  }

  // Scroll to the lesson management section
  lessonManagementSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
