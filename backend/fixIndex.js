// Run this script to fix the shareableLink index issue
// You can run this with: node fixIndex.js

const mongoose = require('mongoose');
require('dotenv').config();

async function fixShareableLinkIndex() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('tests');

    // Drop the existing index
    try {
      await collection.dropIndex('shareableLink_1');
      console.log('Dropped existing shareableLink index');
    } catch (error) {
      console.log('Index might not exist, continuing...');
    }

    // Update all documents with null shareableLink to remove the field entirely
    const result = await collection.updateMany(
      { shareableLink: null },
      { $unset: { shareableLink: "" } }
    );
    console.log(`Updated ${result.modifiedCount} documents to remove null shareableLink`);

    // Create the index again with simple sparse setting
    await collection.createIndex(
      { shareableLink: 1 }, 
      { 
        unique: true,
        sparse: true
      }
    );
    console.log('Created new shareableLink index with proper sparse setting');

    console.log('Index fix completed successfully!');
  } catch (error) {
    console.error('Error fixing index:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
}

fixShareableLinkIndex();