// FileName: /I-cad/js/teacher-lesson-management.js

let currentManagedCourseId = null;
const lessonsList = document.getElementById('lessons-list');
const lessonTitleInput = document.getElementById('lesson-title');
const saveLessonBtn = document.getElementById('save-lesson-btn');
const lessonFormTitle = document.getElementById('lesson-form-title'); // Get the form title element

// New elements for content management
const toggleContentCollapseBtn = document.getElementById('toggle-content-collapse');
const contentCollapseSection = document.getElementById('content-collapse-section');
const contentUploadSection = document.getElementById('content-upload-section');

const quizModeToggle = document.getElementById('quiz-mode-toggle');
const quizSection = document.getElementById('quiz-section');
const quizQuestionsContainer = document.getElementById('quiz-questions-container');
const addQuestionBtn = document.getElementById('add-question-btn');

let quizQuestions = [
  {
    question: '',
    options: ['', '', '', ''],
    correctAnswerIndex: 0
  }
];

let lessonContentItems = []; // Array to hold content items {type, data}

document.addEventListener('DOMContentLoaded', function() {
  // Event listener for saving a new lesson
  saveLessonBtn.addEventListener('click', saveLesson);

  // Event listener for the Cancel button in the lesson form
  document.getElementById('cancel-lesson-btn').addEventListener('click', cancelLessonEdit);

  // Event listener for the Back to Courses button
  document.getElementById('back-to-courses-btn').addEventListener('click', backToCourses);

  // Toggle collapsible content section
  toggleContentCollapseBtn.addEventListener('click', () => {
    if (contentCollapseSection.style.display === 'block') {
      contentCollapseSection.style.display = 'none';
    } else {
      contentCollapseSection.style.display = 'block';
    }
  });

  // Content option buttons event delegation
  contentCollapseSection.querySelectorAll('.content-option-btn').forEach(button => {
    button.addEventListener('click', () => {
      const type = button.getAttribute('data-type');
      showContentInput(type);
    });
  });

  // Quiz mode toggle event
  quizModeToggle.addEventListener('change', () => {
    const lessonContentBox = document.querySelector('.lesson-content-box');
    if (quizModeToggle.checked) {
      toggleContentCollapseBtn.style.display = 'inline-block'; // Keep + Add Content button visible
      // Keep collapsible content section visible but disable content option buttons and hide content upload section
      contentCollapseSection.style.display = 'block';
      const contentOptions = contentCollapseSection.querySelector('.content-options');
      const contentUploadSection = document.getElementById('content-upload-section');
      if (contentOptions) {
        contentOptions.querySelectorAll('.content-option-btn').forEach(btn => btn.disabled = true);
      }
      if (contentUploadSection) {
        contentUploadSection.style.display = 'none';
      }
      quizSection.style.display = 'block';
      // Hide content textarea container when quiz mode enabled
      if (lessonContentBox) lessonContentBox.style.display = 'none';
      disableContentOptionButtons(true);
    } else {
      toggleContentCollapseBtn.style.display = 'inline-block'; // Show + Add Content button
      contentCollapseSection.style.display = 'block'; // Show collapsible content section
      const contentOptions = contentCollapseSection.querySelector('.content-options');
      const contentUploadSection = document.getElementById('content-upload-section');
      if (contentOptions) {
        contentOptions.querySelectorAll('.content-option-btn').forEach(btn => btn.disabled = false);
      }
      if (contentUploadSection) {
        contentUploadSection.style.display = 'block';
      }
      quizSection.style.display = 'none';
      // Show content textarea container when quiz mode disabled
      if (lessonContentBox) lessonContentBox.style.display = 'block';
      disableContentOptionButtons(false);
    }
  });

  // Add question button event
  addQuestionBtn.addEventListener('click', () => {
    addQuizQuestion();
  });

  renderQuizQuestions();
});

window.loadCourseLessons = function(courseId) {
  currentManagedCourseId = courseId;
  lessonsList.innerHTML = "<p class='empty-state'>Loading lessons...</p>";
  clearLessonForm(); // Clear form when loading new course's lessons
  lessonContentItems = []; // Clear content items on new course load
  quizModeToggle.checked = false;
  quizSection.style.display = 'none';

  db.collection('courses').doc(courseId).collection('lessons')
    .orderBy('createdAt', 'asc') // Order lessons by creation time
    .get()
    .then(snapshot => {
      lessonsList.innerHTML = ""; // Clear loading text
      if (snapshot.empty) {
        lessonsList.innerHTML = "<p class='empty-state'>No lessons added to this course yet.</p>";
        return;
      }
      snapshot.forEach(doc => {
        displayLesson(doc.id, doc.data());
      });
    })
    .catch(error => {
      lessonsList.innerHTML = `<p class='error-message'>Error loading lessons: ${error.message}</p>`;
      console.error("Error loading lessons:", error);
    });
};

function displayLesson(lessonId, lesson) {
  const lessonItem = document.createElement('div');
  lessonItem.className = 'lesson-item';
  lessonItem.setAttribute('data-lesson-id', lessonId);

  lessonItem.innerHTML = `
    <h3><a href="teacher-lesson-detail.html?courseId=${currentManagedCourseId}&lessonId=${lessonId}">${lesson.title || 'Untitled Lesson'}</a></h3>
    <div class="lesson-controls">
      <button class="edit-lesson-btn" onclick="editLesson('${lessonId}')">Edit</button>
      <button class="delete-lesson-btn" onclick="deleteLesson('${lessonId}', '${lesson.title || 'Untitled Lesson'}')">Delete</button>
    </div>
  `;
  lessonsList.appendChild(lessonItem);
}

function saveLesson() {
  if (!currentManagedCourseId) {
    alert("Please select a course to manage lessons for first.");
    return;
  }

  const title = lessonTitleInput.value.trim();

  if (!title) {
    alert("Lesson title cannot be empty.");
    return;
  }

  // If quiz mode enabled, gather quiz data
  const quizMode = quizModeToggle.checked;
  let quizData = null;
  if (quizMode) {
    if (quizQuestions.length === 0) {
      alert("Please add at least one quiz question.");
      return;
    }
    for (let i = 0; i < quizQuestions.length; i++) {
      const q = quizQuestions[i];
      if (!q.question.trim() || q.options.some(opt => !opt.trim())) {
        alert(`Please fill in all fields for question ${i + 1}.`);
        return;
      }
    }
    quizData = quizQuestions.map(q => ({
      question: q.question.trim(),
      options: q.options.map(opt => opt.trim()),
      correctAnswerIndex: q.correctAnswerIndex
    }));
  }

  // Prepare lesson data with content items and quiz
  const lessonData = {
    title,
    content: lessonContentItems, // array of {type, data}
    quizMode,
    quiz: quizData,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  // Check if we are editing an existing lesson or creating a new one
  const editingLessonId = saveLessonBtn.getAttribute('data-editing-id');

  if (editingLessonId) {
    // Update existing lesson
    db.collection('courses').doc(currentManagedCourseId).collection('lessons').doc(editingLessonId).update(lessonData)
      .then(() => {
        alert("Lesson updated successfully!");
        clearLessonForm();
        loadCourseLessons(currentManagedCourseId); // Reload lessons
      })
      .catch(error => {
        console.error("Error updating lesson:", error);
        alert("Error updating lesson: " + error.message);
      });
  } else {
    // Create new lesson
    db.collection('courses').doc(currentManagedCourseId).collection('lessons').add(lessonData)
      .then(() => {
        alert("Lesson created successfully!");
        clearLessonForm();
        loadCourseLessons(currentManagedCourseId); // Reload lessons
      })
      .catch(error => {
        console.error("Error creating lesson:", error);
        alert("Error creating lesson: " + error.message);
      });
  }
}

window.editLesson = function(lessonId) {
  if (!currentManagedCourseId) {
    alert("No course selected for lesson management.");
    return;
  }

  db.collection('courses').doc(currentManagedCourseId).collection('lessons').doc(lessonId).get()
    .then(doc => {
      if (doc.exists) {
        const lesson = doc.data();
        lessonTitleInput.value = lesson.title || '';
        lessonContentItems = lesson.content || [];
        quizModeToggle.checked = lesson.quizMode || false;
        if (quizModeToggle.checked) {
          quizSection.style.display = 'block';
          quizQuestions = lesson.quiz || [{
            question: '',
            options: ['', '', '', ''],
            correctAnswerIndex: 0
          }];
          renderQuizQuestions();
          contentCollapseSection.style.display = 'none';
        } else {
          quizSection.style.display = 'none';
          contentCollapseSection.style.display = 'block';
        }
        saveLessonBtn.textContent = 'Update Lesson';
        saveLessonBtn.setAttribute('data-editing-id', lessonId);
        lessonFormTitle.textContent = 'Edit Lesson'; // Update form title
        lessonTitleInput.focus(); // Focus on the title for editing
        renderContentItems();
      } else {
        alert("Lesson not found.");
      }
    })
    .catch(error => {
      console.error("Error fetching lesson for edit:", error);
      alert("Error loading lesson data: " + error.message);
    });
};

window.deleteLesson = function(lessonId, lessonTitle) {
  if (!currentManagedCourseId) {
    alert("No course selected for lesson management.");
    return;
  }

  if (confirm(`Are you sure you want to delete the lesson "${lessonTitle}"? This action cannot be undone.`)) {
    db.collection('courses').doc(currentManagedCourseId).collection('lessons').doc(lessonId).delete()
      .then(() => {
        alert(`Lesson "${lessonTitle}" deleted successfully!`);
        loadCourseLessons(currentManagedCourseId); // Reload lessons
      })
      .catch(error => {
        console.error("Error deleting lesson:", error);
        alert("Error deleting lesson: " + error.message);
      });
  }
};

function clearLessonForm() {
  lessonTitleInput.value = '';
  lessonContentItems = [];
  saveLessonBtn.textContent = 'Save Lesson';
  saveLessonBtn.removeAttribute('data-editing-id');
  lessonFormTitle.textContent = 'Add Lesson'; // Reset form title
  quizModeToggle.checked = false;
  quizSection.style.display = 'none';
  contentCollapseSection.style.display = 'none';
  quizQuestions = [{
    question: '',
    options: ['', '', '', ''],
    correctAnswerIndex: 0
  }];
  renderQuizQuestions();
  clearContentUploadSection();
}

function backToCourses() {
  const lessonManagementSection = document.getElementById('lesson-management');
  const teacherCoursesSection = document.getElementById('teacher-courses-section');

  lessonManagementSection.style.display = 'none'; // Hide lesson management
  teacherCoursesSection.style.display = 'block'; // Show teacher courses
  currentManagedCourseId = null; // Clear the current course ID
  clearLessonForm(); // Clear the lesson form
  // Optionally, scroll back to the top of the teacher courses section
  teacherCoursesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelLessonEdit() {
  clearLessonForm(); // Simply clear the form and reset button text
}

// Helper to show content input based on type
function showContentInput(type) {
  clearContentUploadSection();
  if (type === 'text') {
    const textarea = document.createElement('textarea');
    textarea.id = 'content-text-input';
    textarea.placeholder = 'Enter text content here...';
    textarea.rows = 4;
    textarea.style.width = '100%';
    contentUploadSection.appendChild(textarea);

    const addBtn = document.createElement('button');
    addBtn.textContent = 'Add Text Content';
    addBtn.className = 'content-option-btn';
    addBtn.style.marginTop = '10px';
    addBtn.addEventListener('click', () => {
      const text = textarea.value.trim();
      if (!text) {
        alert('Text content cannot be empty.');
        return;
      }
      lessonContentItems.push({ type: 'text', data: text });
      clearContentUploadSection();
      renderContentItems();
    });
    contentUploadSection.appendChild(addBtn);
  } else if (type === 'pdf' || type === 'image' || type === 'video') {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    if (type === 'pdf') {
      fileInput.accept = 'application/pdf';
    } else if (type === 'image') {
      fileInput.accept = 'image/*';
    } else if (type === 'video') {
      fileInput.accept = 'video/*';
    }
    contentUploadSection.appendChild(fileInput);

    const uploadBtn = document.createElement('button');
    uploadBtn.textContent = `Upload ${type.toUpperCase()}`;
    uploadBtn.className = 'content-option-btn';
    uploadBtn.style.marginTop = '10px';
    uploadBtn.addEventListener('click', () => {
      if (!fileInput.files.length) {
        alert('Please select a file to upload.');
        return;
      }
      const file = fileInput.files[0];
      uploadFile(file, type);
    });
    contentUploadSection.appendChild(uploadBtn);
  }
}

// Clear content upload section
function clearContentUploadSection() {
  contentUploadSection.innerHTML = '';
}

// Render content items list below the form
function renderContentItems() {
  // Remove existing content items display if any
  let existingList = document.getElementById('content-items-list');
  if (existingList) {
    existingList.remove();
  }

  if (lessonContentItems.length === 0) return;

  const list = document.createElement('div');
  list.id = 'content-items-list';
  list.style.marginTop = '15px';

  lessonContentItems.forEach((item, index) => {
    const itemDiv = document.createElement('div');
    itemDiv.style.border = '1px solid #ccc';
    itemDiv.style.padding = '8px';
    itemDiv.style.borderRadius = '4px';
    itemDiv.style.marginBottom = '8px';
    itemDiv.style.display = 'flex';
    itemDiv.style.justifyContent = 'space-between';
    itemDiv.style.alignItems = 'center';

    let contentDesc = '';
    if (item.type === 'text') {
      contentDesc = `Text: ${item.data.substring(0, 50)}${item.data.length > 50 ? '...' : ''}`;
    } else if (item.type === 'pdf') {
      contentDesc = `PDF: ${item.data}`;
    } else if (item.type === 'image') {
      contentDesc = `Image: ${item.data}`;
    } else if (item.type === 'video') {
      contentDesc = `Video: ${item.data}`;
    }

    const descSpan = document.createElement('span');
    descSpan.textContent = contentDesc;

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.className = 'content-option-btn';
    removeBtn.style.backgroundColor = '#dc3545';
    removeBtn.style.marginLeft = '10px';
    removeBtn.addEventListener('click', () => {
      lessonContentItems.splice(index, 1);
      renderContentItems();
    });

    itemDiv.appendChild(descSpan);
    itemDiv.appendChild(removeBtn);
    list.appendChild(itemDiv);
  });

  contentUploadSection.parentNode.insertBefore(list, contentUploadSection.nextSibling);
}

function uploadFile(file, type) {
  const formData = new FormData();
  formData.append('file', file);

  // Adjust the URL below to the correct path of upload.php on your Hostinger server
  const uploadUrl = 'https://nexapay.me/apps/icad/upload.php';

  fetch(uploadUrl, {
    method: 'POST',
    body: formData
  })
  .then(response => response.text()) // Get raw response text first
  .then(text => {
    try {
      const data = JSON.parse(text);
      if (data.url) {
        lessonContentItems.push({ type, data: data.url });
        clearContentUploadSection();
        renderContentItems();
        alert(`${type.toUpperCase()} uploaded successfully.`);
      } else if (data.error) {
        alert('Upload failed: ' + data.error);
      } else {
        alert('Upload failed: Unknown error');
      }
    } catch (e) {
      console.error('Failed to parse JSON response:', text);
      alert('Upload failed: Server returned invalid response. See console for details.');
    }
  })
  .catch(error => {
    alert('Upload failed: ' + error.message);
  });
}

function saveContentTextarea() {
  const contentTextarea = document.getElementById('lesson-content-textarea');
  const text = contentTextarea.value.trim();
  if (text) {
    lessonContentItems = lessonContentItems.filter(item => item.type !== 'text');
    lessonContentItems.push({ type: 'text', data: text });
  } else {
    lessonContentItems = lessonContentItems.filter(item => item.type !== 'text');
  }
}

const originalSaveLesson = saveLesson;
saveLesson = function() {
  saveContentTextarea();
  originalSaveLesson();
};

function disableContentOptionButtons(disable) {
  const buttons = contentCollapseSection.querySelectorAll('.content-option-btn');
  buttons.forEach(button => {
    button.disabled = disable;
  });
  // Also disable content textarea when disabling content options
  const contentTextarea = document.getElementById('lesson-content-textarea');
  if (contentTextarea) {
    contentTextarea.disabled = disable;
    contentTextarea.style.display = disable ? 'none' : 'block';
  }
}

// Render quiz questions dynamically
function renderQuizQuestions() {
  quizQuestionsContainer.innerHTML = '';
  quizQuestions.forEach((q, index) => {
    const card = document.createElement('div');
    card.className = 'quiz-question-card';
    card.setAttribute('data-question-index', index);

    const questionLabel = document.createElement('label');
    questionLabel.textContent = 'Question';
    questionLabel.setAttribute('for', `quiz-question-${index}`);

    const questionInput = document.createElement('input');
    questionInput.type = 'text';
    questionInput.id = `quiz-question-${index}`;
    questionInput.className = 'quiz-option-input';
    questionInput.placeholder = 'Enter quiz question';
    questionInput.value = q.question;
    questionInput.addEventListener('input', e => {
      quizQuestions[index].question = e.target.value;
    });

    const optionsLabel = document.createElement('label');
    optionsLabel.textContent = 'Options';

    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'quiz-options';

    for (let i = 0; i < 4; i++) {
      const optionInput = document.createElement('input');
      optionInput.type = 'text';
      optionInput.id = `quiz-option-${index}-${i}`;
      optionInput.className = 'quiz-option-input';
      optionInput.placeholder = `Option ${i + 1}`;
      optionInput.value = q.options[i];
      optionInput.addEventListener('input', e => {
        quizQuestions[index].options[i] = e.target.value;
      });
      optionsDiv.appendChild(optionInput);
    }

    const correctAnswerLabel = document.createElement('label');
    correctAnswerLabel.textContent = 'Select Correct Answer';

    const correctAnswerDiv = document.createElement('div');

    for (let i = 0; i < 4; i++) {
      const radioInput = document.createElement('input');
      radioInput.type = 'radio';
      radioInput.name = `quiz-correct-answer-${index}`;
      radioInput.id = `correct-answer-${index}-${i}`;
      radioInput.className = 'quiz-correct-radio';
      radioInput.value = i;
      radioInput.checked = q.correctAnswerIndex === i;
      radioInput.addEventListener('change', e => {
        if (e.target.checked) {
          quizQuestions[index].correctAnswerIndex = i;
        }
      });

      const radioLabel = document.createElement('label');
      radioLabel.setAttribute('for', `correct-answer-${index}-${i}`);
      radioLabel.textContent = `Option ${i + 1}`;

      correctAnswerDiv.appendChild(radioInput);
      correctAnswerDiv.appendChild(radioLabel);
    }

    // Add delete button for quiz question
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete Question';
    deleteBtn.style.backgroundColor = '#dc3545';
    deleteBtn.style.color = 'white';
    deleteBtn.style.border = 'none';
    deleteBtn.style.borderRadius = '6px';
    deleteBtn.style.padding = '6px 12px';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.style.marginTop = '10px';
    deleteBtn.addEventListener('click', () => {
      quizQuestions.splice(index, 1);
      renderQuizQuestions();
    });

    card.appendChild(questionLabel);
    card.appendChild(questionInput);
    card.appendChild(optionsLabel);
    card.appendChild(optionsDiv);
    card.appendChild(correctAnswerLabel);
    card.appendChild(correctAnswerDiv);
    card.appendChild(deleteBtn);

    quizQuestionsContainer.appendChild(card);
  });
}

// Add a new quiz question
function addQuizQuestion() {
  quizQuestions.push({
    question: '',
    options: ['', '', '', ''],
    correctAnswerIndex: 0
  });
  renderQuizQuestions();
}
