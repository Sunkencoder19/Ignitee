// Classes and the students in them.
// Phase 1 only defines the models (student login in auth.js needs them).
// The routes for creating classes and adding students come in phase 2.

import mongoose from 'mongoose'

const { Schema, model } = mongoose

// ---------- models ----------

const classSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    // Short code students type to log in, e.g. "K7PQ2M". Unique across the app.
    code: { type: String, required: true, unique: true, uppercase: true },
    teacher: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

export const Class = model('Class', classSchema, 'classes')

const studentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    class: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    teacher: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
    pinHash: { type: String, required: true },
    // The history of lessons finished: one entry per lesson, the first time.
    lessonsFinished: [
      {
        _id: false,
        lesson: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
        date: { type: String, required: true }, // 'YYYY-MM-DD', server's local date
      },
    ],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

// No two students in one class with the same name ("Diya" and "diya" count as the same),
// because students pick their name from a list to log in.
studentSchema.index({ class: 1, name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } })

export const Student = model('Student', studentSchema, 'students')
