// Example: TeacherProfileCard.jsx
// This shows how to display teacher experience details in the frontend

import React from 'react';
import { Award, BookOpen, Briefcase, Calendar } from 'lucide-react';

export default function TeacherProfileCard({ teacher }) {
  if (!teacher) return null;

  const currentYear = new Date().getFullYear();
  const yearsExp = teacher.yearsOfExperience || 0;
  const joinedYear = teacher.joinedYear || currentYear;

  return (
    <div className="card p-6 space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {teacher.name}
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>{teacher.email}</p>
      </div>

      {/* Experience Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-lg" style={{ background: 'var(--bg-hover)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Briefcase size={18} style={{ color: 'var(--primary)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
              Experience
            </span>
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {yearsExp} years
          </div>
        </div>

        <div className="p-4 rounded-lg" style={{ background: 'var(--bg-hover)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={18} style={{ color: 'var(--accent)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
              Joined
            </span>
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {joinedYear}
          </div>
        </div>
      </div>

      {/* Qualifications */}
      {teacher.qualifications && teacher.qualifications.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            Qualifications
          </h3>
          <div className="flex flex-wrap gap-2">
            {teacher.qualifications.map((qual, idx) => (
              <span
                key={idx}
                className="badge badge-indigo"
              >
                {qual}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Specializations */}
      {teacher.specialization && teacher.specialization.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            Specializations
          </h3>
          <div className="flex flex-wrap gap-2">
            {teacher.specialization.map((spec, idx) => (
              <span
                key={idx}
                className="badge badge-cyan"
              >
                {spec}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {teacher.certifications && teacher.certifications.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Award size={18} />
            Certifications
          </h3>
          <div className="space-y-2">
            {teacher.certifications.map((cert, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg flex items-center gap-2"
                style={{ background: 'var(--bg-hover)' }}
              >
                <span className="text-lg">✓</span>
                <span style={{ color: 'var(--text-primary)' }}>{cert}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Publications */}
      {teacher.publications !== undefined && (
        <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <BookOpen size={18} style={{ color: 'var(--success)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
              Research Publications
            </span>
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {teacher.publications}
          </div>
        </div>
      )}

      {/* Experience Badge */}
      <div className="p-4 rounded-lg" style={{
        background: yearsExp >= 5 ? 'rgba(139,92,246,0.1)' : 'rgba(6,182,212,0.1)',
        border: `1px solid ${yearsExp >= 5 ? 'rgba(139,92,246,0.2)' : 'rgba(6,182,212,0.2)'}`
      }}>
        <span className={`badge ${yearsExp >= 5 ? 'badge-violet' : 'badge-cyan'}`}>
          {yearsExp >= 5 ? '⭐ Senior Faculty' : '👤 Junior Faculty'}
        </span>
      </div>
    </div>
  );
}

// Usage Example:
/*
import TeacherProfileCard from './TeacherProfileCard';

function TeacherPage() {
  const teacher = {
    name: 'Prof. Rajesh Kumar',
    email: 'teacher1@almts.com',
    yearsOfExperience: 5,
    joinedYear: 2019,
    qualifications: ['B.Tech', 'M.Tech', 'PhD'],
    specialization: ['Data Structures', 'Algorithms'],
    publications: 12,
    certifications: ['AWS Certified', 'Google Cloud Certified']
  };

  return <TeacherProfileCard teacher={teacher} />;
}
*/
