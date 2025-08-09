const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// Helper function to recalculate totalCoins for a user
async function recalculateTotalCoins(userId) {
  const quizScoresSnapshot = await db.collection('users').doc(userId).collection('quizScores').get();
  let totalCoins = 0;
  quizScoresSnapshot.forEach(doc => {
    const data = doc.data();
    totalCoins += data.score || 0;
  });

  const commentedLessonsSnapshot = await db.collection('users').doc(userId).collection('commentedLessons').get();
  totalCoins += commentedLessonsSnapshot.size;

  await db.collection('users').doc(userId).update({ totalCoins });
}

// Trigger on create/update/delete in quizScores subcollection
exports.onQuizScoreChange = functions.firestore
  .document('users/{userId}/quizScores/{quizScoreId}')
  .onWrite(async (change, context) => {
    const userId = context.params.userId;
    await recalculateTotalCoins(userId);
  });

// Trigger on create/delete in commentedLessons subcollection
exports.onCommentedLessonChange = functions.firestore
  .document('users/{userId}/commentedLessons/{commentedLessonId}')
  .onWrite(async (change, context) => {
    const userId = context.params.userId;
    await recalculateTotalCoins(userId);
  });
