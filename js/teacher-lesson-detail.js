// FileName: /I-cad/js/teacher-lesson-detail.js

document.addEventListener('DOMContentLoaded', function() {
  const lessonTitleDisplay = document.getElementById('lesson-title-display');
  const lessonContentDisplay = document.getElementById('lesson-content-display');
  const lessonDetailError = document.getElementById('lesson-detail-error');
  const pageTitle = document.getElementById('page-title');

  const editLessonBtn = document.getElementById('edit-lesson-btn');
  const editLessonForm = document.getElementById('edit-lesson-form');
  const editLessonTitleInput = document.getElementById('edit-lesson-title');
  const editLessonContentTextarea = document.getElementById('edit-lesson-content');
  const saveEditedLessonBtn = document.getElementById('save-edited-lesson-btn');
  const cancelEditLessonBtn = document.getElementById('cancel-edit-lesson-btn');

  const commentInput = document.getElementById('comment-input');
  const addCommentBtn = document.getElementById('add-comment-btn');
  const commentError = document.getElementById('comment-error');
  const commentsList = document.getElementById('comments-list');

  let currentUserId = null;
  let currentUserName = 'Anonymous';
  let currentCourseId = null;
  let currentLessonId = null;
  let currentLessonData = null; // To store the lesson data for editing

  // Authentication Guard
  auth.onAuthStateChanged(user => {
    if (user) {
      currentUserId = user.uid;
      db.collection('users').doc(user.uid).get().then(userDoc => {
        if (userDoc.exists) {
          const userData = userDoc.data();
          currentUserName = userData.email || 'Anonymous';
          const role = userData.role;

          // Only teachers can view this page
          if (role === "teacher") {
            const urlParams = new URLSearchParams(window.location.search);
            currentCourseId = urlParams.get('courseId');
            currentLessonId = urlParams.get('lessonId');

            if (currentCourseId && currentLessonId) {
              loadLessonDetails(currentCourseId, currentLessonId);
              loadComments(currentCourseId, currentLessonId);
            } else {
              lessonDetailError.textContent = "Error: Course ID or Lesson ID not provided.";
              lessonContentDisplay.innerHTML = "<p class='empty-state'>No lesson selected to view.</p>";
            }
          } else {
            alert("Access Denied: You are not authorized to view this page.");
            auth.signOut().then(() => {
              window.location.href = "login.html";
            });
          }
        } else {
          alert("User profile not found. Please try logging in again.");
          auth.signOut().then(() => {
            window.location.href = "login.html";
          });
        }
      }).catch(error => {
        console.error("Error fetching user role:", error);
        alert("Error checking user role. Please try again.");
        auth.signOut().then(() => {
          window.location.href = "login.html";
        });
      });
    } else {
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

  // Edit Lesson Button Handler
  editLessonBtn.addEventListener('click', function() {
    if (currentLessonData) {
      editLessonTitleInput.value = currentLessonData.title || '';
      // Convert content array to JSON string for editing
      editLessonContentTextarea.value = currentLessonData.content ? JSON.stringify(currentLessonData.content, null, 2) : '';
      editLessonForm.style.display = 'block'; // Show the form
      lessonContentDisplay.style.display = 'none'; // Hide the display content
      editLessonBtn.style.display = 'none'; // Hide the edit button
    }
  });

  // Save Edited Lesson Button Handler
  saveEditedLessonBtn.addEventListener('click', function() {
    const newTitle = editLessonTitleInput.value.trim();
    const newContentRaw = editLessonContentTextarea.value.trim();

    if (!newTitle || !newContentRaw) {
      alert("Lesson title and content cannot be empty.");
      return;
    }

    let newContent;
    try {
      newContent = JSON.parse(newContentRaw);
      if (!Array.isArray(newContent)) {
        alert("Lesson content must be a JSON array.");
        return;
      }
    } catch (e) {
      alert("Invalid JSON format for lesson content.");
      return;
    }

    db.collection('courses').doc(currentCourseId).collection('lessons').doc(currentLessonId).update({
      title: newTitle,
      content: newContent,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
      alert("Lesson updated successfully!");
      // Reload details to show updated content
      loadLessonDetails(currentCourseId, currentLessonId);
      // Hide form and show display content
      editLessonForm.style.display = 'none';
      lessonContentDisplay.style.display = 'block';
      editLessonBtn.style.display = 'block';
    })
    .catch(error => {
      console.error("Error updating lesson:", error);
      lessonDetailError.textContent = "Error updating lesson: " + error.message;
    });
  });

  // Cancel Edit Lesson Button Handler
  cancelEditLessonBtn.addEventListener('click', function() {
    editLessonForm.style.display = 'none';
    lessonContentDisplay.style.display = 'block';
    editLessonBtn.style.display = 'block';
  });

  // Add Comment Button Handler
  addCommentBtn.addEventListener('click', function() {
    const commentText = commentInput.value.trim();
    commentError.textContent = "";

    if (!commentText) {
      commentError.textContent = "Comment cannot be empty.";
      return;
    }

    if (!currentUserId || !currentCourseId || !currentLessonId) {
      commentError.textContent = "Error: Not logged in or lesson context missing.";
      return;
    }

    db.collection('courses').doc(currentCourseId).collection('lessons').doc(currentLessonId).collection('comments').add({
      userId: currentUserId,
      userName: currentUserName,
      comment: commentText,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
      commentInput.value = ''; // Clear input
      loadComments(currentCourseId, currentLessonId); // Reload comments
    })
    .catch(error => {
      console.error("Error adding comment:", error);
      commentError.textContent = "Error posting comment: " + error.message;
    });
  });

  function loadLessonDetails(courseId, lessonId) {
    db.collection('courses').doc(courseId).collection('lessons').doc(lessonId).get()
      .then(lessonDoc => {
        if (lessonDoc.exists) {
          currentLessonData = lessonDoc.data(); // Store data for editing
          lessonTitleDisplay.textContent = currentLessonData.title || 'Untitled Lesson';
          pageTitle.textContent = `${currentLessonData.title} | I-Cad Portal`;

          // Clear previous content
          lessonContentDisplay.innerHTML = '';

          if (currentLessonData.content && Array.isArray(currentLessonData.content)) {
            currentLessonData.content.forEach(item => {
              if (item.type === 'text') {
                const p = document.createElement('p');
                p.textContent = item.data;
                lessonContentDisplay.appendChild(p);
              } else if (item.type === 'pdf') {
                const iframe = document.createElement('iframe');
                iframe.src = item.data;
                iframe.width = '100%';
                iframe.height = '600px';
                iframe.style.border = 'none';
                lessonContentDisplay.appendChild(iframe);
              } else if (item.type === 'image') {
                console.log('Loading image from URL:', item.data);
                const img = document.createElement('img');
                img.src = item.data;
                img.alt = 'Lesson Image';
                img.style.maxWidth = '100%';
                img.style.marginBottom = '15px';
                lessonContentDisplay.appendChild(img);
              } else if (item.type === 'video') {
                const video = document.createElement('video');
                video.src = item.data;
                video.controls = true;
                video.style.maxWidth = '100%';
                video.style.marginBottom = '15px';
                lessonContentDisplay.appendChild(video);
              }
            });
          } else {
            lessonContentDisplay.textContent = 'No content provided.';
          }
        } else {
          lessonDetailError.textContent = "Lesson not found.";
          lessonContentDisplay.innerHTML = "<p class='empty-state'>Lesson details could not be loaded.</p>";
        }
      })
      .catch(error => {
        console.error("Error loading lesson details:", error);
        lessonDetailError.textContent = "Error loading lesson details: " + error.message;
        lessonContentDisplay.innerHTML = "<p class='empty-state'>Error loading lesson details.</p>";
      });
  }

  function loadComments(courseId, lessonId) {
    commentsList.innerHTML = "<p class='empty-state'>Loading comments...</p>";
    db.collection('courses').doc(courseId).collection('lessons').doc(lessonId).collection('comments')
      .orderBy('createdAt', 'asc')
      .get()
      .then(snapshot => {
        commentsList.innerHTML = "";
        if (snapshot.empty) {
          commentsList.innerHTML = "<p class='empty-state'>No comments yet. Be the first to comment!</p>";
          return;
        }
        snapshot.forEach(doc => {
          const comment = doc.data();
          const commentItem = document.createElement('div');
          commentItem.className = 'comment-item';
          const commentDate = comment.createdAt ? comment.createdAt.toDate().toLocaleString() : 'N/A';
          commentItem.innerHTML = `
            <p>${comment.comment || 'No comment content.'}</p>
            <div class="comment-meta">Posted by ${comment.userName || 'Anonymous'} on ${commentDate}</div>
          `;
          commentsList.appendChild(commentItem);
        });
      })
      .catch(error => {
        console.error("Error loading comments:", error);
        commentError.textContent = `Error loading comments: ${error.message}`;
        commentsList.innerHTML = `<p class='error-message'>Error loading comments: ${error.message}</p>`;
      });
  }
});
