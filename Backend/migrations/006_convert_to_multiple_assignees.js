/**
 * Migration: Convert single assignedTo to array and create assignments tracking
 * This migration updates existing notes to support multiple assignees
 */

const mongoose = require('mongoose');
const Note = require('../models/Note');

async function up() {
  console.log('Starting migration 006: Convert to multiple assignees...');
  
  try {
    // Find all notes with assignedTo that is not an array
    const notes = await Note.find({
      assignedTo: { $exists: true, $ne: null }
    });

    console.log(`Found ${notes.length} notes with assignments to migrate`);

    let migrated = 0;
    let skipped = 0;

    for (const note of notes) {
      // If assignedTo is already an array, skip
      if (Array.isArray(note.assignedTo)) {
        // Ensure assignments array exists
        if (!note.assignments || note.assignments.length === 0) {
          note.assignments = note.assignedTo.map(userId => ({
            userId,
            status: note.assignmentStatus || 'pending',
            assignedAt: note.assignedAt || note.createdAt || new Date()
          }));
          await note.save();
          migrated++;
        } else {
          skipped++;
        }
        continue;
      }

      // Convert single assignedTo to array
      const originalAssignedTo = note.assignedTo;
      note.assignedTo = [originalAssignedTo];
      
      // Create assignments array
      note.assignments = [{
        userId: originalAssignedTo,
        status: note.assignmentStatus === 'none' ? 'pending' : (note.assignmentStatus || 'pending'),
        assignedAt: note.assignedAt || note.createdAt || new Date(),
        respondedAt: (note.assignmentStatus === 'accepted' || note.assignmentStatus === 'rejected') 
          ? note.updatedAt 
          : null
      }];

      await note.save();
      migrated++;
    }

    console.log(`Migration complete: ${migrated} notes migrated, ${skipped} skipped`);
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

async function down() {
  console.log('Starting rollback 006: Convert back to single assignee...');
  
  try {
    // Find all notes with assignedTo as array
    const notes = await Note.find({
      assignedTo: { $exists: true, $type: 'array' }
    });

    console.log(`Found ${notes.length} notes to rollback`);

    let rolledBack = 0;

    for (const note of notes) {
      if (note.assignedTo.length > 0) {
        // Take the first assignee
        note.assignedTo = note.assignedTo[0];
        
        // Update status from first assignment if available
        if (note.assignments && note.assignments.length > 0) {
          note.assignmentStatus = note.assignments[0].status;
          note.assignedAt = note.assignments[0].assignedAt;
        }
        
        // Clear assignments array
        note.assignments = [];
        
        await note.save();
        rolledBack++;
      }
    }

    console.log(`Rollback complete: ${rolledBack} notes rolled back`);
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  }
}

module.exports = { up, down };
