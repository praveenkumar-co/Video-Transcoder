import React, { useState, useEffect } from 'react';
import { Star, Trash2, Edit2, MessageSquare, Plus } from 'lucide-react';
import { submitFeedback, getMyFeedbackAPI, updateFeedbackAPI, deleteFeedbackAPI, FeedbackItem } from '../api/feedback.api';
import '../style/contact.css';

interface FeedbackUsProps {
  onClose: () => void;
  profile: {
    name: string;
    email: string;
  };
}

export function FeedbackUs({ onClose, profile }: FeedbackUsProps) {
  const [rating, setRating] = useState<number>(5); // default to 5-star review
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // CRUD & history state
  const [activeTab, setActiveTab] = useState<'write' | 'history'>('write');
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null);

  // Extract first name for personalized success message
  const firstName = profile.name.split(' ')[0] || 'User';

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const items = await getMyFeedbackAPI();
      setFeedbacks(items);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (editingFeedbackId) {
        await updateFeedbackAPI(editingFeedbackId, {
          rating,
          feedback: feedbackText,
        });
        setEditingFeedbackId(null);
        showFeedbackSuccess('Review updated successfully!');
      } else {
        await submitFeedback({
          rating,
          feedback: feedbackText,
        });
        showFeedbackSuccess('Feedback submitted successfully!');
      }
      setFeedbackText('');
      setRating(5);
      await loadHistory();
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const showFeedbackSuccess = (msg: string) => {
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setActiveTab('history');
    }, 2000);
  };

  const handleEdit = (item: FeedbackItem) => {
    setEditingFeedbackId(item._id);
    setRating(item.rating);
    setFeedbackText(item.feedback);
    setActiveTab('write');
  };

  const handleDelete = async (feedbackId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;
    try {
      await deleteFeedbackAPI(feedbackId);
      await loadHistory();
      if (editingFeedbackId === feedbackId) {
        setEditingFeedbackId(null);
        setFeedbackText('');
        setRating(5);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete review');
    }
  };

  const starLabels: Record<number, string> = {
    1: 'Needs Improvement',
    2: 'Fair',
    3: 'Good',
    4: 'Very Good',
    5: 'Excellent!',
  };

  return (
    <div className="vf-contact-backdrop" onClick={onClose}>
      <section className="vf-contact-page" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="vf-contact-close-btn" onClick={onClose} aria-label="Close feedback form">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {/* LEFT SIDE */}
        <div className="vf-contact-left">
          {/* BRAND */}
          <div className="vf-contact-brand" onClick={onClose} style={{ cursor: 'pointer' }}>
            <h2>VideoForge</h2>
          </div>

          {/* TEXT */}
          <div className="vf-contact-copy">
            <p>
              Your thoughts help shape the future of VideoForge.
              We read every developer submission to refine our
              high-performance transcoding, AI subtitle pipelines,
              and global media distribution framework.
            </p>

            <div className="vf-contact-meta" style={{ marginTop: '2rem' }}>
              <div className="feedback-tabs-toggle" style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
                <button 
                  className={`btn ${activeTab === 'write' ? 'btn-primary' : 'btn-secondary'}`} 
                  onClick={() => { setActiveTab('write'); }}
                  style={{ flex: 1, padding: '10px 14px', fontSize: '13px' }}
                >
                  <Plus size={14} style={{ marginRight: '6px' }} />
                  {editingFeedbackId ? 'Edit Review' : 'New Feedback'}
                </button>
                <button 
                  className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`} 
                  onClick={() => { setActiveTab('history'); }}
                  style={{ flex: 1, padding: '10px 14px', fontSize: '13px' }}
                >
                  <MessageSquare size={14} style={{ marginRight: '6px' }} />
                  My Reviews ({feedbacks.length})
                </button>
              </div>

              <div>
                <span>✦</span>
                feedback@videoforge.example
              </div>
              <div>
                <span>✦</span>
                +1 000 000 0000
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="vf-contact-right" style={{ maxHeight: '100%', overflowY: 'auto' }}>
          {success ? (
            <div className="vf-contact-success animate-slide-up" style={{ padding: '2rem', textAlign: 'center' }}>
              <div className="success-icon-wrapper" style={{ margin: '0 auto 1.5rem' }}>
                <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                  <circle className="checkmark__circle" cx="26" cy="26" r="25" fill="none" />
                  <path className="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                </svg>
              </div>
              <h2>Submission Success!</h2>
              <p>Your review was successfully saved to our database.</p>
              <p className="success-sub">Logged under account: <strong>{profile.email}</strong></p>
            </div>
          ) : activeTab === 'write' ? (
            <form className="vf-contact-form feedback-no-card" onSubmit={handleSubmit}>
              <h2 className="form-breathe-heading">{editingFeedbackId ? 'Update Your Feedback' : 'Give Feedback'}</h2>
              <p>{editingFeedbackId ? 'Modify your review rating and description' : 'We appreciate your honest rating'}</p>

              {error && <div className="vf-error-message" style={{ color: 'var(--danger-color)', marginBottom: '14px', fontSize: '13px' }}>{error}</div>}

              {/* Read-Only Prefilled Name */}
              <input
                type="text"
                value={profile.name}
                disabled
                style={{
                  opacity: 0.8,
                  cursor: 'not-allowed',
                  background: 'rgba(15, 23, 42, 0.03)',
                  borderColor: 'rgba(15, 23, 42, 0.05)',
                  fontWeight: 500
                }}
              />

              {/* Read-Only Prefilled Email */}
              <input
                type="email"
                value={profile.email}
                disabled
                style={{
                  opacity: 0.8,
                  cursor: 'not-allowed',
                  background: 'rgba(15, 23, 42, 0.03)',
                  borderColor: 'rgba(15, 23, 42, 0.05)',
                  fontWeight: 500,
                  marginBottom: '18px'
                }}
              />

              {/* Interactive Star Rating Selector */}
              <div className="vf-star-rating-container" style={{ marginBottom: '14px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '8px', textAlign: 'left' }}>
                  YOUR RATING
                </span>
                <div className="vf-star-rating" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {[1, 2, 3, 4, 5].map((starIndex) => {
                    const isStarred = hoverRating !== null ? starIndex <= hoverRating : starIndex <= rating;
                    return (
                      <button
                        key={starIndex}
                        type="button"
                        className={isStarred ? 'active' : ''}
                        onClick={() => setRating(starIndex)}
                        onMouseEnter={() => setHoverRating(starIndex)}
                        onMouseLeave={() => setHoverRating(null)}
                        aria-label={`Rate ${starIndex} out of 5 stars`}
                        disabled={submitting}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '2px',
                          color: isStarred ? '#eab308' : '#cbd5e1',
                          outline: 'none',
                          transition: 'color 0.15s ease'
                        }}
                      >
                        <Star
                          size={30}
                          fill={isStarred ? 'currentColor' : 'none'}
                          strokeWidth={2}
                        />
                      </button>
                    );
                  })}
                  <span className="vf-star-label" style={{ marginLeft: '12px', fontSize: '13px', fontWeight: 500, color: '#64748b' }}>
                    {starLabels[hoverRating ?? rating]}
                  </span>
                </div>
              </div>

              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="What did you think of our transcoding, compression, or format conversion features? How can we make the platform better?"
                required
                disabled={submitting}
                style={{
                  minHeight: '120px',
                  borderRadius: '8px',
                  padding: '12px',
                  border: '1px solid rgba(15, 23, 42, 0.1)',
                  outline: 'none',
                  fontSize: '14px',
                  marginBottom: '18px'
                }}
              ></textarea>

              <div style={{ display: 'flex', gap: '10px' }}>
                {editingFeedbackId && (
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => {
                      setEditingFeedbackId(null);
                      setFeedbackText('');
                      setRating(5);
                    }}
                    style={{ flex: 1, padding: '12px', borderRadius: '8px' }}
                  >
                    Cancel
                  </button>
                )}
                <button type="submit" disabled={submitting} style={{ flex: 2, padding: '12px', borderRadius: '8px', background: 'var(--accent-color)', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                  {submitting ? 'Processing...' : editingFeedbackId ? 'Update Feedback →' : 'Send Feedback →'}
                </button>
              </div>
            </form>
          ) : (
            <div className="feedback-history-container" style={{ padding: '1.5rem 1rem' }}>
              <h2 style={{ marginBottom: '6px', fontSize: '1.5rem', fontWeight: 600, color: '#0f172a' }}>My Reviews</h2>
              <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>Manage your previously submitted ratings and testimonials.</p>

              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Loading reviews history...</div>
              ) : feedbacks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(15, 23, 42, 0.02)', borderRadius: '12px', border: '1px dashed rgba(15, 23, 42, 0.08)' }}>
                  <MessageSquare size={40} style={{ color: '#94a3b8', marginBottom: '12px' }} />
                  <p style={{ fontWeight: 500, color: '#475569', marginBottom: '4px' }}>No Reviews Submitted Yet</p>
                  <p style={{ fontSize: '12px', color: '#94a3b8' }}>Your feedback will appear here once you write a review.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {feedbacks.map((item) => (
                    <div 
                      key={item._id} 
                      style={{
                        background: '#ffffff',
                        border: '1px solid rgba(15, 23, 42, 0.08)',
                        borderRadius: '12px',
                        padding: '14px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '2px', color: '#eab308' }}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} size={14} fill={s <= item.rating ? 'currentColor' : 'none'} strokeWidth={2} />
                          ))}
                        </div>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <p style={{ fontSize: '13.5px', color: '#334155', lineHeight: '1.45', whiteSpace: 'pre-wrap', margin: 0 }}>
                        {item.feedback}
                      </p>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid rgba(0, 0, 0, 0.03)', paddingTop: '8px', marginTop: '4px' }}>
                        <button 
                          onClick={() => handleEdit(item)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            color: '#0284c7',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            fontWeight: 500
                          }}
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(item._id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            color: '#ef4444',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            fontWeight: 500
                          }}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
