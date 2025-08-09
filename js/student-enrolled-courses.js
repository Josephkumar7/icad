// FileName: /I-cad/js/student-enrolled-courses.js

document.addEventListener('DOMContentLoaded', function () {
  const enrolledCoursesGrid = document.getElementById('enrolled-courses-grid');
  let currentUserId = null;

  // Authentication Guard: Check if user is logged in and is a student
  auth.onAuthStateChanged(user => {
    if (user) {
      currentUserId = user.uid;
      db.collection('users').doc(user.uid).get().then(userDoc => {
        if (userDoc.exists && userDoc.data().role === "student") {
          loadEnrolledCourses(currentUserId);
        } else {
          // User is logged in but not a student, or role data is missing
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

  function loadEnrolledCourses(studentId) {
    enrolledCoursesGrid.innerHTML = "<p class='empty-state'>Loading your enrolled courses...</p>";
    db.collection('users').doc(studentId).collection('enrolledCourses').get()
      .then(snapshot => {
        if (snapshot.empty) {
          enrolledCoursesGrid.innerHTML = "<p class='empty-state'>You are not enrolled in any courses yet.</p>";
          return;
        }
        
        const enrolledCoursePromises = [];
        snapshot.forEach(doc => {
          // Fetch full course details from the 'courses' collection
          enrolledCoursePromises.push(db.collection('courses').doc(doc.id).get());
        });

        Promise.all(enrolledCoursePromises)
          .then(courseDocs => {
            const enrolledCoursesData = [];
            courseDocs.forEach(courseDoc => {
              if (courseDoc.exists) {
                enrolledCoursesData.push({ id: courseDoc.id, ...courseDoc.data() });
              }
            });
            displayEnrolledCourses(enrolledCoursesData);
          })
          .catch(error => {
            console.error("Error fetching enrolled course details:", error);
            enrolledCoursesGrid.innerHTML = `<p class='error-message'>Error loading enrolled course details: ${error.message}</p>`;
          });
      })
      .catch(error => {
        enrolledCoursesGrid.innerHTML = `<p class='error-message'>Error loading enrolled courses: ${error.message}</p>`;
        console.error("Error loading enrolled courses:", error);
      });
  }

  function displayEnrolledCourses(courses) {
    enrolledCoursesGrid.innerHTML = "";
    if (courses.length === 0) {
      enrolledCoursesGrid.innerHTML = "<p class='empty-state'>You are not enrolled in any courses yet.</p>";
      return;
    }
    courses.forEach(course => {
      const card = document.createElement('div');
      card.className = 'course-card';
      card.innerHTML = `
        <img src="${course.thumbnailUrl || '../assets/course-default.png'}" alt="Course Thumbnail" class="course-thumb">
        <div class="course-info">
          <h3 class="course-title">${course.name || 'Untitled Course'}</h3>
          <p class="course-instructor">Instructor: ${course.instructorName || 'N/A'}</p>
          <button class="course-action-btn" onclick="viewCourse('${course.id}')">View Course</button>
          <button class="course-action-btn" style="background-color: #dc3545;" onclick="unenrollCourse('${course.id}', '${course.name || 'Untitled Course'}')">Unenroll</button>
        </div>
      `;
      enrolledCoursesGrid.appendChild(card);
    });
  }

  window.unenrollCourse = function(courseId, courseName) {
    if (!currentUserId) {
      alert("Please log in to unenroll from courses.");
      return;
    }

    if (confirm(`Are you sure you want to unenroll from "${courseName}"?`)) {
      db.collection('users').doc(currentUserId).collection('enrolledCourses').doc(courseId).delete()
        .then(() => {
          alert(`Successfully unenrolled from "${courseName}".`);
          loadEnrolledCourses(currentUserId); // Reload enrolled courses after unenrollment
        })
        .catch(error => {
          console.error("Error unenrolling from course:", error);
          alert("Error unenrolling from course: " + error.message);
        });
    }
  };

  window.viewCourse = function(courseId) {
    // Redirect to the new course detail page, passing the course ID
    window.location.href = `course-detail.html?id=${courseId}`;
  };
});
