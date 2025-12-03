import { useState } from 'react';

export default function SpecialistCard({ specialist, onBook }) {
  const [imageError, setImageError] = useState(false);

  const getRatingStars = (rating) => {
    return '⭐'.repeat(rating);
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'Hair': '💇',
      'Nails': '💅',
      'Makeup': '💄'
    };
    return icons[category] || '✨';
  };

  return (
    <div className="specialist-card">
      <div className="specialist-icon">
        {specialist.imageUrl && !imageError ? (
          <img 
            src={specialist.imageUrl} 
            alt={`${specialist.name} logo`}
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'contain',
              borderRadius: '0.5rem'
            }}
            onError={() => setImageError(true)}
          />
        ) : (
          getCategoryIcon(specialist.category)
        )}
      </div>
      <div className="specialist-info">
        <h3>{specialist.name}</h3>
        <p className="specialist-category">{specialist.category} Specialist</p>
        {specialist.description && (
          <p className="specialist-description">{specialist.description}</p>
        )}
        <div className="specialist-details">
          <span className="specialist-rating">{getRatingStars(specialist.rating)}</span>
          <span className="specialist-price">£{specialist.pricePerHour}/hour</span>
        </div>
      </div>
      <button onClick={() => onBook(specialist)} className="btn-book">
        Book Now
      </button>
    </div>
  );
}

