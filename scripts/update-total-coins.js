/**
 * One-time script to recalculate and update 'totalCoins' field for all users in Firestore.
 * This script sums quizScores and commentedLessons counts for each user and updates their document.
 * 
 * Usage: Run this script in a Node.js environment with Firebase Admin SDK configured.
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK with application default credentials
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();

async function updateTotalCoinsForAllUsers() {
  try {
    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.size} users.`);

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;

      // Sum quizScores
      const quizScoresSnapshot = await db.collection('users').doc(userId).collection('quizScores').get();
      let totalCoins = 0;
      quizScoresSnapshot.forEach(doc => {
        const data = doc.data();
        totalCoins += data.score || 0;
      });

      // Add commentedLessons count
      const commentedLessonsSnapshot = await db.collection('users').doc(userId).collection('commentedLessons').get();
      totalCoins += commentedLessonsSnapshot.size;

      // Update totalCoins field in user document
      await db.collection('users').doc(userId).update({
        totalCoins: totalCoins
      });

      console.log(`Updated totalCoins for user ${userId}: ${totalCoins}`);
    }

    console.log('Finished updating totalCoins for all users.');
  } catch (error) {
    console.error('Error updating totalCoins:', error);
  }
}

updateTotalCoinsForAllUsers();
