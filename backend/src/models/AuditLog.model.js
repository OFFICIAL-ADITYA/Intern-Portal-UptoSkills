import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      default: null,
      index: true
    },
    actorRole: {
      type: String,
      enum: ['admin', 'teamleader', 'intern', 'system'],
      required: true,
      default: 'system',
      index: true
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    targetType: {
      type: String,
      trim: true,
      default: null,
      index: true
    },
    targetId: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ip: {
      type: String,
      default: ''
    },
    userAgent: {
      type: String,
      default: ''
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: -1
    }
  },
  {
    timestamps: false,
    versionKey: false
  }
);

// Indexes
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, createdAt: -1 });

// Backward compatibility virtuals/helpers for legacy userId / ipAddress
auditLogSchema.virtual('userId').get(function () {
  return this.actorId;
});

auditLogSchema.virtual('ipAddress').get(function () {
  return this.ip;
});

// Pre-save hook: map legacy fields if passed
auditLogSchema.pre('save', function () {
  if (this.userId && !this.actorId) {
    this.actorId = this.userId;
  }
  if (this.ipAddress && !this.ip) {
    this.ip = this.ipAddress;
  }
});

// Append-only enforcement: block updateOne, findOneAndUpdate, and deleteOne through schema hooks
const appendOnlyError = () => new Error('AuditLog is append-only and cannot be modified or deleted');

auditLogSchema.pre('updateOne', function () {
  throw appendOnlyError();
});

auditLogSchema.pre('findOneAndUpdate', function () {
  throw appendOnlyError();
});

auditLogSchema.pre('updateMany', function () {
  throw appendOnlyError();
});

auditLogSchema.pre('deleteOne', function () {
  throw appendOnlyError();
});

auditLogSchema.pre('findOneAndDelete', function () {
  throw appendOnlyError();
});

auditLogSchema.pre('deleteMany', function () {
  throw appendOnlyError();
});

auditLogSchema.pre('remove', function () {
  throw appendOnlyError();
});

const AuditLog = mongoose.models.audit_log || mongoose.model('audit_log', auditLogSchema);

export default AuditLog;
