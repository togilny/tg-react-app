import SpecialistCard from './SpecialistCard';

export default function SpecialistList({ specialists, onBook, isLoading }) {
  if (isLoading) {
    return <p className="loading-text">Loading specialists...</p>;
  }

  if (specialists.length === 0) {
    return (
      <div className="empty-state">
        <p>No specialists found</p>
      </div>
    );
  }

  return (
    <div className="specialist-list">
      {specialists.map((specialist) => (
        <SpecialistCard
          key={specialist.id}
          specialist={specialist}
          onBook={onBook}
        />
      ))}
    </div>
  );
}

