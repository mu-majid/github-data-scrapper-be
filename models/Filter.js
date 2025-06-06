import mongoose from 'mongoose';

const filterSchema = new mongoose.Schema({
  userId: {
    type: String,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  collection: {
    type: String,
    required: true
  },
  filters: {
    dateRange: {
      field: String,
      startDate: Date,
      endDate: Date
    },
    status: {
      field: String,
      values: [String]
    },
    customFields: [{
      field: String,
      operator: {
        type: String,
        enum: ['equals', 'contains', 'startsWith', 'endsWith', 'greaterThan', 'lessThan', 'in', 'notIn']
      },
      value: mongoose.Schema.Types.Mixed
    }]
  },
  isActive: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

filterSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Filter', filterSchema);
