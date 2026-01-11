require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

async function backupDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, 'backups', timestamp);
    
    // Create backup directory
    if (!fs.existsSync(path.join(__dirname, 'backups'))) {
      fs.mkdirSync(path.join(__dirname, 'backups'));
    }
    fs.mkdirSync(backupDir);
    
    console.log('=== DATABASE BACKUP ===');
    console.log('Backup directory: ' + backupDir);
    console.log('Timestamp: ' + timestamp);
    console.log('');
    
    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log('Found ' + collections.length + ' collections to backup\n');
    
    let totalDocs = 0;
    
    for (const collInfo of collections) {
      const collectionName = collInfo.name;
      
      // Skip system collections
      if (collectionName.startsWith('system.')) {
        continue;
      }
      
      console.log('Backing up: ' + collectionName + '...');
      
      const collection = db.collection(collectionName);
      const docs = await collection.find({}).toArray();
      
      const filePath = path.join(backupDir, collectionName + '.json');
      fs.writeFileSync(filePath, JSON.stringify(docs, null, 2));
      
      console.log('  ✓ ' + docs.length + ' documents backed up');
      totalDocs += docs.length;
    }
    
    // Create metadata file
    const metadata = {
      timestamp: timestamp,
      database: db.databaseName,
      totalCollections: collections.filter(c => !c.name.startsWith('system.')).length,
      totalDocuments: totalDocs,
      mongoUri: process.env.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//****:****@'),
      collections: collections.filter(c => !c.name.startsWith('system.')).map(c => c.name)
    };
    
    fs.writeFileSync(
      path.join(backupDir, '_metadata.json'), 
      JSON.stringify(metadata, null, 2)
    );
    
    console.log('\n=== BACKUP COMPLETE ===');
    console.log('Total collections: ' + metadata.totalCollections);
    console.log('Total documents: ' + totalDocs);
    console.log('Backup location: ' + backupDir);
    console.log('');
    
    // Create a restore script
    const restoreScript = `#!/usr/bin/env node
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

async function restore() {
  try {
    console.log('WARNING: This will OVERWRITE current database data!');
    console.log('Backup from: ${timestamp}');
    console.log('');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    
    console.log('\\n=== RESTORING DATABASE ===\\n');
    
    const files = fs.readdirSync(__dirname);
    
    for (const file of files) {
      if (file === '_metadata.json' || !file.endsWith('.json')) continue;
      
      const collectionName = file.replace('.json', '');
      console.log('Restoring: ' + collectionName + '...');
      
      const data = JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
      
      // Drop existing collection
      try {
        await db.collection(collectionName).drop();
      } catch (e) {
        // Collection might not exist
      }
      
      // Insert backup data
      if (data.length > 0) {
        await db.collection(collectionName).insertMany(data);
        console.log('  ✓ ' + data.length + ' documents restored');
      }
    }
    
    console.log('\\n=== RESTORE COMPLETE ===');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

restore();
`;
    
    fs.writeFileSync(
      path.join(backupDir, 'restore.js'), 
      restoreScript
    );
    fs.chmodSync(path.join(backupDir, 'restore.js'), '755');
    
    console.log('Restore script created: restore.js');
    console.log('To restore this backup, run: node ' + path.join(backupDir, 'restore.js'));

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

backupDatabase();
