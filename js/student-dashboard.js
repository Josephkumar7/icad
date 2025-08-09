// FileName: /I-cad/js/student-dashboard.js

document.addEventListener('DOMContentLoaded', function () {
  const allCoursesGrid = document.getElementById('all-courses-grid');
  const courseSearchInput = document.getElementById('course-search');
  const courseFilterSelect = document.getElementById('course-filter'); // This will now only have 'All Courses' option

  let currentUserId = null;
  let allCourses = []; // To store all courses for filtering
  let enrolledCourseIds = new Set(); // To store IDs of courses the student is enrolled in

  // Authentication Guard: Check if user is logged in and is a student
  auth.onAuthStateChanged(user => {
    if (user) {
      currentUserId = user.uid;
      db.collection('users').doc(user.uid).get().then(userDoc => {
if (userDoc.exists && (userDoc.data().role === "student" || userDoc.data().role === "teacher")) {
          // User is a student or teacher, proceed with loading courses
          // First, load enrolled course IDs to correctly display 'Enrolled' status
          db.collection('users').doc(currentUserId).collection('enrolledCourses').get()
            .then(snapshot => {
              enrolledCourseIds.clear();
              snapshot.forEach(doc => {
                enrolledCourseIds.add(doc.id);
              });
              loadAllCourses(); // Now load all courses after knowing enrolled ones
            })
            .catch(error => {
              console.error("Error loading enrolled course IDs:", error);
              alert("Error loading your enrollment status. Please try again.");
              loadAllCourses(); // Still try to load all courses even if enrollment status fails
            });
        } else {
          // User is logged in but not a student or teacher, or role data is missing
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

  // Search and Filter Event Listeners
  courseSearchInput.addEventListener('input', filterCourses);
  courseFilterSelect.addEventListener('change', filterCourses); // This will only respond to 'all' now

  function loadAllCourses() {
    allCoursesGrid.innerHTML = "<p class='empty-state'>Loading available courses...</p>";
    db.collection('courses').get()
      .then(snapshot => {
        allCourses = [];
        snapshot.forEach(doc => {
          allCourses.push({ id: doc.id, ...doc.data() });
        });
        filterCourses(); // Display all courses initially (and apply any existing search)
      })
      .catch(error => {
        allCoursesGrid.innerHTML = `<p class='error-message'>Error loading courses: ${error.message}</p>`;
        console.error("Error loading all courses:", error);
      });
  }

  function displayCourses(courses, targetGrid = allCoursesGrid) {
    targetGrid.innerHTML = "";
    if (courses.length === 0) {
      targetGrid.innerHTML = `<p class='empty-state'>No courses found matching your criteria.</p>`;
      return;
    }
    courses.forEach(course => {
      const card = document.createElement('div');
      card.className = 'course-card';
      const isEnrolled = enrolledCourseIds.has(course.id);
      const buttonText = isEnrolled ? 'Enrolled' : 'Enroll';
      const buttonClass = isEnrolled ? 'enroll-btn enrolled' : 'enroll-btn';
      const buttonDisabled = isEnrolled ? 'disabled' : '';

      card.innerHTML = `
        <img src="${course.thumbnailUrl || '../assets/course-default.png'}" alt="Course Thumbnail" class="course-thumb">
        <div class="course-info">
          <h3 class="course-title">${course.name || 'Untitled Course'}</h3>
          <p class="course-instructor">Instructor: ${course.instructorName || 'N/A'}</p>
          <button class="${buttonClass}" ${buttonDisabled} onclick="enrollCourse('${course.id}', '${course.name || 'Untitled Course'}')">${buttonText}</button>
        </div>
      `;
      targetGrid.appendChild(card);
    });
  }

  function filterCourses() {
    const searchTerm = courseSearchInput.value ? courseSearchInput.value.toLowerCase() : '';
    // const filterCategory = courseFilterSelect.value; // No longer needed for 'enrolled'/'unattended'

    const filtered = allCourses.filter(course => {
      const courseName = course.name ? course.name.toLowerCase() : '';
      const courseDescription = course.description ? course.description.toLowerCase() : '';
      const courseInstructor = course.instructorName ? course.instructorName.toLowerCase() : '';

      const matchesSearch = courseName.includes(searchTerm) ||
                            courseDescription.includes(searchTerm) ||
                            courseInstructor.includes(searchTerm);
      
      // Since 'enrolled'/'unattended' filters are removed from this page,
      // matchesCategory will always be true if 'all' is selected.
      // If you add other categories later, this logic would expand.
      return matchesSearch;
    });
    displayCourses(filtered, allCoursesGrid);
  }

  window.enrollCourse = function(courseId, courseName) {
    if (!currentUserId) {
      alert("Please log in to enroll in courses.");
      return;
    }

    if (enrolledCourseIds.has(courseId)) {
      alert("You are already enrolled in this course.");
      return;
    }

    db.collection('users').doc(currentUserId).collection('enrolledCourses').doc(courseId).set({
      courseId: courseId,
      courseName: courseName,
      enrolledAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
      alert(`Successfully enrolled in "${courseName}"!`);
      enrolledCourseIds.add(courseId); // Update the set immediately
      filterCourses(); // Re-render courses to update the button state
    })
    .catch(error => {
      console.error("Error enrolling in course:", error);
      alert("Error enrolling in course: " + error.message);
    });
  };

  window.viewCourse = function(courseId) {
    // Redirect to the new course detail page, passing the course ID
    window.location.href = `course-detail.html?id=${courseId}`;
  };
});
