// FileName: /I-cad/js/lesson-detail.js

document.addEventListener('DOMContentLoaded', function() {
  const lessonTitleDisplay = document.getElementById('lesson-title-display');
  const lessonContentDisplay = document.getElementById('lesson-content-display');
  const lessonDetailError = document.getElementById('lesson-detail-error');
  const pageTitle = document.getElementById('page-title');

  const commentInput = document.getElementById('comment-input');
  const addCommentBtn = document.getElementById('add-comment-btn');
  const commentError = document.getElementById('comment-error');
  const commentsList = document.getElementById('comments-list');

  let currentUserId = null;
  let currentUserName = 'Anonymous'; // Default, will try to fetch from user profile
  let currentCourseId = null;
  let currentLessonId = null;
  let lessonsList = [];
  let currentLessonIndex = -1;

  // Authentication Guard
  auth.onAuthStateChanged(user => {
    if (user) {
      currentUserId = user.uid;
      db.collection('users').doc(user.uid).get().then(userDoc => {
        if (userDoc.exists) {
          const userData = userDoc.data();
          currentUserName = userData.email || 'Anonymous'; // Use email as display name
          const role = userData.role;

          // Only students and teachers can view lesson details
          if (role === "student" || role === "teacher") {
            const urlParams = new URLSearchParams(window.location.search);
            currentCourseId = urlParams.get('courseId');
            currentLessonId = urlParams.get('lessonId');

            if (currentCourseId && currentLessonId) {
              loadLessonsList(currentCourseId).then(() => {
                updateCurrentLessonIndex(currentLessonId);
                loadLessonDetails(currentCourseId, currentLessonId);
                loadComments(currentCourseId, currentLessonId);
                // Call after lessons and index are set, and after DOM is ready
                setTimeout(updateNavigationButtons, 0);
              });
            } else {
              lessonDetailError.textContent = "Error: Course ID or Lesson ID not provided.";
              lessonContentDisplay.innerHTML = "<p class='empty-state'>No lesson selected to view.</p>";
            }
          } else {
            alert("Access Denied: You are not authorized to view lesson details.");
            auth.signOut().then(() => {
              window.location.href = "login.html";
            });
          }
        } else {
          // User document not found, log out
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

  // Add Comment button handler
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

          // Add comment to Firestore
          db.collection('courses').doc(currentCourseId).collection('lessons').doc(currentLessonId)
            .collection('comments').add({
              userId: currentUserId,
              userName: currentUserName,
              comment: commentText,
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
              commentInput.value = ''; // Clear input
              loadComments(currentCourseId, currentLessonId); // Reload comments

              // Check if user already got a comment point for this lesson
              db.collection('users').doc(currentUserId)
                .collection('commentedLessons')
                .doc(currentLessonId)
                .get()
                .then(docSnapshot => {
                  if (!docSnapshot.exists) {
                    // First comment on this lesson, award point and mark as commented
                    db.collection('users').doc(currentUserId).update({
                      points: firebase.firestore.FieldValue.increment(1)
                    });
                    db.collection('users').doc(currentUserId)
                      .collection('commentedLessons')
                      .doc(currentLessonId)
                      .set({ commented: true });
                  }
                  // Update totalCoins after comment added
                  updateUserTotalCoins(currentUserId);
                });
            })
            .catch(error => {
              console.error("Error adding comment:", error);
              commentError.textContent = "Error posting comment: " + error.message;
            });
  });

  // Function to update coins for a lesson comment
  function updateCoinsForLesson(userId, lessonId) {
    const userCoinsRef = db.collection('users').doc(userId).collection('coins').doc('coinData');

    // Check if user already has a coin for this lesson
    userCoinsRef.get()
      .then(doc => {
        let coinData = {};
        if (doc.exists) {
          coinData = doc.data();
        }

        if (!coinData.commentedLessons) {
          coinData.commentedLessons = [];
        }

        if (!coinData.commentedLessons.includes(lessonId)) {
          // Add lessonId to commentedLessons and increment coin count
          coinData.commentedLessons.push(lessonId);
          coinData.coinCount = (coinData.coinCount || 0) + 1;

          userCoinsRef.set(coinData)
            .then(() => {
              console.log("Coin count updated:", coinData.coinCount);
              updateCoinDisplay(coinData.coinCount);
            })
            .catch(error => {
              console.error("Error updating coin count:", error);
            });
        } else {
          // Already has coin for this lesson, just update display
          updateCoinDisplay(coinData.coinCount || 0);
        }
      })
      .catch(error => {
        console.error("Error fetching coin data:", error);
      });
  }

  // Function to update coin count display on profile page
  function updateCoinDisplay(count) {
    const coinCountElem = document.getElementById('coin-count');
    if (coinCountElem) {
      coinCountElem.textContent = count;
      // Add animation or styling here if needed
    }
  }

  // Remove lesson completion checkbox related code as it is removed from HTML
  // So no loadLessonCompletionStatus or markCompletedCheckbox event listeners

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

  function loadLessonDetails(courseId, lessonId) {
    db.collection('courses').doc(courseId).collection('lessons').doc(lessonId).get()
      .then(lessonDoc => {
        if (lessonDoc.exists) {
          const lesson = lessonDoc.data();
          lessonTitleDisplay.textContent = lesson.title || 'Untitled Lesson';
          pageTitle.textContent = `${lesson.title} | I-Cad Portal`; // Update browser tab title

          // Clear previous content
          lessonContentDisplay.innerHTML = '';

          if (lesson.quizMode) {
            // Render quiz
            renderQuiz(lesson.quiz);
          } else if (lesson.content && Array.isArray(lesson.content)) {
            // Render content items
            lesson.content.forEach(item => {
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
          updateCurrentLessonIndex(lessonId);
          setTimeout(updateNavigationButtons, 0); // Ensure buttons update after lesson loads
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

function renderQuiz(quiz) {
    if (!quiz || !Array.isArray(quiz) || quiz.length === 0) {
      lessonContentDisplay.innerHTML = '<p>No quiz data available.</p>';
      return;
    }

    const container = document.createElement('div');
    container.style.border = '1px solid #ffd700';
    container.style.padding = '15px';
    container.style.borderRadius = '8px';
    container.style.backgroundColor = '#fffbea';
    container.style.marginTop = '20px';

    quiz.forEach((questionObj, questionIndex) => {
      const questionEl = document.createElement('h3');
      questionEl.textContent = questionObj.question || `Quiz Question ${questionIndex + 1}`;
      container.appendChild(questionEl);

      const optionsList = document.createElement('ul');
      optionsList.style.listStyleType = 'none';
      optionsList.style.padding = '0';

      if (Array.isArray(questionObj.options)) {
        questionObj.options.forEach((option, index) => {
          const li = document.createElement('li');
          li.style.marginBottom = '10px';

          const label = document.createElement('label');
          label.style.cursor = 'pointer';

          const radio = document.createElement('input');
          radio.type = 'radio';
          radio.name = `quiz-answer-${questionIndex}`;
          radio.value = index;
          radio.disabled = false; // Enable for user input

          label.appendChild(radio);
          label.appendChild(document.createTextNode(' ' + option));

          li.appendChild(label);
          optionsList.appendChild(li);
        });
      }

      container.appendChild(optionsList);
    });

    // Add submit button for quiz
    const submitBtn = document.createElement('button');
    submitBtn.textContent = 'Submit Quiz';
    submitBtn.id = 'submit-quiz-btn'; // Add an ID for easy selection
    submitBtn.style.marginTop = '15px';
    submitBtn.style.padding = '10px 20px';
    submitBtn.style.backgroundColor = '#2b3a55';
    submitBtn.style.color = '#fff';
    submitBtn.style.border = 'none';
    submitBtn.style.borderRadius = '6px';
    submitBtn.style.cursor = 'pointer';

    container.appendChild(submitBtn);
    lessonContentDisplay.appendChild(container);

    // Check if already attempted
    db.collection('users').doc(currentUserId)
      .collection('completedQuizzes')
      .doc(currentLessonId)
      .get()
      .then(doc => {
        if (doc.exists && doc.data().attempted) {
          // Show message that quiz is already attempted
          const messageDiv = document.createElement('div');
          messageDiv.style.marginTop = '20px';
          messageDiv.style.padding = '10px';
          messageDiv.style.backgroundColor = '#ffdddd';
          messageDiv.style.border = '1px solid #ff0000';
          messageDiv.style.borderRadius = '5px';
          messageDiv.textContent = 'You have already attempted this quiz. You cannot attempt it again, but you can view your answers.';

          // Disable all quiz options and submit button
          container.querySelectorAll('input[type="radio"]').forEach(opt => opt.disabled = true);
          const submitBtn = document.getElementById('submit-quiz-btn');
          if (submitBtn) {
            submitBtn.disabled = true;
          }

          // Add a button to view quiz result
          const viewResultBtn = document.createElement('button');
          viewResultBtn.textContent = 'View Quiz Result';
          viewResultBtn.style.marginTop = '10px';
          viewResultBtn.style.padding = '10px 20px';
          viewResultBtn.style.backgroundColor = '#2b3a55';
          viewResultBtn.style.color = '#fff';
          viewResultBtn.style.border = 'none';
          viewResultBtn.style.borderRadius = '6px';
          viewResultBtn.style.cursor = 'pointer';

          viewResultBtn.addEventListener('click', () => {
            const score = doc.data().score || 0;
            const total = quiz.length;
            const courseId = new URLSearchParams(window.location.search).get('courseId');
            const lessonId = new URLSearchParams(window.location.search).get('lessonId');
            window.location.href = `quiz-result.html?courseId=${courseId}&lessonId=${lessonId}&score=${score}&total=${total}`;
          });

          lessonContentDisplay.appendChild(messageDiv);
          lessonContentDisplay.appendChild(viewResultBtn);
        }
      });


    submitBtn.addEventListener('click', () => {
      handleQuizSubmission(quiz, container, submitBtn);
    });
  }

function handleQuizSubmission(quiz, container, submitBtn) {
  let allAnswered = true;
  let totalScore = 0;

  for (let i = 0; i < quiz.length; i++) {
    const selectedOption = container.querySelector(`input[name="quiz-answer-${i}"]:checked`);
    if (!selectedOption) {
      allAnswered = false;
      break;
    }
    const selectedIndex = parseInt(selectedOption.value, 10);
    const correctIndex = quiz[i].correctAnswerIndex || 0;
    if (selectedIndex === correctIndex) {
      totalScore += 1;
    }
  }

  if (!allAnswered) {
    alert('Please select an answer for all questions before submitting.');
    return;
  }

  // Display score
  const scoreDisplay = document.createElement('p');
  scoreDisplay.textContent = `You scored ${totalScore} out of ${quiz.length} points.`;
  scoreDisplay.style.marginTop = '10px';
  scoreDisplay.style.fontWeight = 'bold';
  container.appendChild(scoreDisplay);

  // Save score in Firestore under user's data
  auth.onAuthStateChanged(user => {
    if (user) {
      const userId = user.uid;
      const courseId = new URLSearchParams(window.location.search).get('courseId');
      const lessonId = new URLSearchParams(window.location.search).get('lessonId');

      if (courseId && lessonId) {
        db.collection('users').doc(userId).collection('quizScores').doc(lessonId).set({
          courseId: courseId,
          lessonId: lessonId,
          quizTitle: quiz.map(q => q.question).join('; '),
          score: totalScore,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
          console.log('Quiz score saved successfully.');
          // Redirect to quiz result page with score and quiz info
          window.location.href = `quiz-result.html?courseId=${courseId}&lessonId=${lessonId}&score=${totalScore}&total=${quiz.length}`;
        }).catch(error => {
          console.error('Error saving quiz score:', error);
        });
      }
    }
  });

          // After quiz is submitted and answer is checked:
          db.collection('users').doc(currentUserId)
            .collection('completedQuizzes')
            .doc(currentLessonId)
            .get()
            .then(doc => {
              if (!doc.exists) {
                // First attempt, award points
                db.collection('users').doc(currentUserId).update({
                  points: firebase.firestore.FieldValue.increment(1)
                });
              }
              // Save the attempt as above
              db.collection('users').doc(currentUserId)
                .collection('completedQuizzes')
                .doc(currentLessonId)
                .set({
                  attempted: true,
                  score: totalScore,
                  timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
              // Update totalCoins after quiz submitted
              updateUserTotalCoins(currentUserId);
            });

  // After saving the attempt:
  // Disable all options and button
  container.querySelectorAll('input[type="radio"]').forEach(opt => opt.disabled = true);
  submitBtn.disabled = true;
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

  // Load the list of lessons in the course to enable prev/next navigation
  function loadLessonsList(courseId) {
    return db.collection('courses').doc(courseId).collection('lessons')
      .orderBy('title', 'asc')
      .get()
      .then(snapshot => {
        lessonsList = [];
        snapshot.forEach(doc => {
          const lesson = doc.data();
          lesson.id = doc.id;
          lessonsList.push(lesson);
        });
      })
      .catch(error => {
        console.error("Error loading lessons list:", error);
      });
  }

  // Update currentLessonIndex based on currentLessonId
  function updateCurrentLessonIndex(lessonId) {
    currentLessonIndex = lessonsList.findIndex(lesson => lesson.id === lessonId);
    console.log("Current lesson index:", currentLessonIndex);
  }

  // Update visibility and handlers of navigation buttons
  function updateNavigationButtons() {
    const prevBtn = document.getElementById('prev-lesson-btn');
    const nextBtn = document.getElementById('next-lesson-btn');
    const backBtn = document.getElementById('back-to-courses-btn');

    // Back to Course Button
    if (backBtn) {
      backBtn.style.visibility = 'visible';
      backBtn.disabled = false;
      backBtn.textContent = '← Back to Course';
      backBtn.onclick = () => {
        if (currentCourseId) {
          window.location.href = `course-detail.html?id=${currentCourseId}`;
        } else if (document.referrer && document.referrer !== window.location.href) {
          window.history.back();
        } else {
          window.location.href = 'student-dashboard.html';
        }
      };
    }

    // Previous Lesson Button
    if (prevBtn) {
      prevBtn.style.display = 'inline-block';
      prevBtn.textContent = '← Previous Lesson';
      if (currentLessonIndex > 0) {
        prevBtn.disabled = false;
        prevBtn.style.visibility = 'visible';
        prevBtn.onclick = () => {
          const prevLesson = lessonsList[currentLessonIndex - 1];
          if (prevLesson) {
            window.location.href = `lesson-detail.html?courseId=${currentCourseId}&lessonId=${prevLesson.id}`;
          }
        };
      } else {
        prevBtn.disabled = true;
        prevBtn.style.visibility = 'hidden';
        prevBtn.onclick = null;
      }
    }

    // Next Lesson Button
    if (nextBtn) {
      nextBtn.style.display = 'inline-block';
      nextBtn.textContent = 'Next Lesson →';
      if (currentLessonIndex >= 0 && currentLessonIndex < lessonsList.length - 1) {
        nextBtn.disabled = false;
        nextBtn.style.visibility = 'visible';
        nextBtn.onclick = () => {
          const nextLesson = lessonsList[currentLessonIndex + 1];
          if (nextLesson) {
            window.location.href = `lesson-detail.html?courseId=${currentCourseId}&lessonId=${nextLesson.id}`;
          }
        };
      } else {
        nextBtn.disabled = true;
        nextBtn.style.visibility = 'hidden';
        nextBtn.onclick = null;
      }
    }
  }

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

  // On page load, check if quiz already attempted
  db.collection('users').doc(currentUserId)
    .collection('completedQuizzes')
    .doc(currentLessonId)
    .get()
    .then(doc => {
      if (doc.exists && doc.data().attempted) {
        document.querySelectorAll('.quiz-option').forEach(opt => opt.disabled = true);
        document.getElementById('submit-quiz-btn').disabled = true;
      }
    });

  // On quiz submit:
  function handleQuizSubmit() {
    db.collection('users').doc(currentUserId)
      .collection('completedQuizzes')
      .doc(currentLessonId)
      .get()
      .then(doc => {
        if (!doc.exists) {
          // Award point for first attempt
          db.collection('users').doc(currentUserId).update({
            points: firebase.firestore.FieldValue.increment(1)
          });
        }
        // Save attempt
        db.collection('users').doc(currentUserId)
          .collection('completedQuizzes')
          .doc(currentLessonId)
          .set({
            attempted: true,
            score: 1,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          });
        // Disable quiz
        document.querySelectorAll('.quiz-option').forEach(opt => opt.disabled = true);
        document.getElementById('submit-quiz-btn').disabled = true;
      });
  }

  const quiz = lessonData.quiz;
  let questions = quiz && quiz.questions ? quiz.questions : [];
  if (!Array.isArray(questions)) {
    if (questions) {
      questions = [questions]; // wrap single question as array
    } else {
      questions = [];
    }
  }
  questions.forEach(q => {
    // render question
  });
});
