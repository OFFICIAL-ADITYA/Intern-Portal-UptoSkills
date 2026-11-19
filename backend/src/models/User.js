import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        mobileNo: {
            type: String
        },

        internCode: {
            type: String,
            unique: true,
            sparse: true
        },

        domain: {
            type: String
        },

        startDate: {
            type: Date
        },

        endDate: {
            type: Date
        },

        password: {
            type: String,
            required: function () {
                return !this.internCode;
            }
        },

        passwordSetAt: {
            type: Date,
            default: null
        },

        resetPasswordToken: {
            type: String
        },

        resetPasswordExpires: {
            type: Date
        },

        role: {
            type: String,
            enum: ["admin", "intern", "teamleader"],
            default: "intern"
        },
        internshipDetails:{
            teamLeaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', index: true },
            teamleaderEmail: { type: String, trim: true, lowercase: true },
            status: {
                type: String,
                enum: ["upcoming", "ongoing", "completed", "cancelled"],
                default: "upcoming"
            },
            createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
            createdAt: { type: Date, default: Date.now }
        },

        isArchived: {
            type: Boolean,
            default: false,
            index: true
        },

        archivedAt: {
            type: Date,
            default: null
        },

        archiveWarningSentAt: {
            type: Date,
            default: null
        },

        isPurged: {
            type: Boolean,
            default: false,
            index: true
        },

        purgedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    });


userSchema.methods.comparePassword = async function (candidatePassword) {

    return bcrypt.compare(
        candidatePassword,
        this.password
    );

};

userSchema.pre("save", async function (next) {
    if (!this.internCode) {
        this.internCode = this.email
    }

    if (!this.isModified("password")) {
        return;
    }

    // Never store a plain-text password or intern code.
    if (!/^\$2[aby]\$\d{2}\$/.test(this.password)) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next;
});

// Task K: Query optimization indexes for role, domain, team leader scoping and archiving
userSchema.index({ role: 1, isArchived: 1 });
userSchema.index({ role: 1, domain: 1 });
userSchema.index({ 'internshipDetails.teamLeaderId': 1, role: 1 });
userSchema.index({ 'internshipDetails.teamleaderEmail': 1, role: 1 });
userSchema.index({ 'internshipDetails.status': 1, isArchived: 1 });

const userModel = mongoose.model(
    "user",
    userSchema
);

export default userModel;
