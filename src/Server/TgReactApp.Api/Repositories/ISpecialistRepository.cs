using TgReactApp.Api.Models;

namespace TgReactApp.Api.Repositories;

public interface ISpecialistRepository
{
    List<Specialist> GetAll();
    List<Specialist> GetByCategory(string category);
    Specialist? GetById(Guid id);
    Specialist? GetByUserId(Guid userId);
    Specialist Add(string name, string category, string? description, string? imageUrl, decimal pricePerHour, int rating, Guid? userId = null);
    Specialist? Update(Guid id, string name, string category, string? description, string? imageUrl, decimal pricePerHour, int rating);
    bool Delete(Guid id);
}

public class InMemorySpecialistRepository : ISpecialistRepository
{
    private readonly List<Specialist> _specialists = new()
    {
        new Specialist
        {
            Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
            Name = "Sarah Johnson",
            Category = "Hair",
            Description = "Expert hair stylist with 10+ years experience",
            PricePerHour = 60,
            Rating = 5,
            CreatedAt = DateTime.UtcNow
        },
        new Specialist
        {
            Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
            Name = "Emily Chen",
            Category = "Nails",
            Description = "Certified nail technician specializing in nail art",
            PricePerHour = 45,
            Rating = 5,
            CreatedAt = DateTime.UtcNow
        },
        new Specialist
        {
            Id = Guid.Parse("33333333-3333-3333-3333-333333333333"),
            Name = "Maria Garcia",
            Category = "Makeup",
            Description = "Professional makeup artist for all occasions",
            PricePerHour = 80,
            Rating = 5,
            CreatedAt = DateTime.UtcNow
        },
        new Specialist
        {
            Id = Guid.Parse("44444444-4444-4444-4444-444444444444"),
            Name = "Rebecca Black",
            Category = "Hair",
            Description = "Specializing in color and balayage",
            PricePerHour = 70,
            Rating = 4,
            CreatedAt = DateTime.UtcNow
        },
        new Specialist
        {
            Id = Guid.Parse("55555555-5555-5555-5555-555555555555"),
            Name = "Amanda White",
            Category = "Nails",
            Description = "Gel extensions and manicure expert",
            PricePerHour = 50,
            Rating = 5,
            CreatedAt = DateTime.UtcNow
        }
    };

    public List<Specialist> GetAll() => _specialists;

    public List<Specialist> GetByCategory(string category) =>
        _specialists.Where(s => s.Category.Equals(category, StringComparison.OrdinalIgnoreCase)).ToList();

    public Specialist? GetById(Guid id) => _specialists.FirstOrDefault(s => s.Id == id);

    public Specialist? GetByUserId(Guid userId) => _specialists.FirstOrDefault(s => s.UserId == userId);

    public Specialist Add(string name, string category, string? description, string? imageUrl, decimal pricePerHour, int rating, Guid? userId = null)
    {
        var specialist = new Specialist
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = name,
            Category = category,
            Description = description,
            ImageUrl = imageUrl,
            PricePerHour = pricePerHour,
            Rating = Math.Clamp(rating, 1, 5),
            CreatedAt = DateTime.UtcNow
        };

        _specialists.Add(specialist);
        return specialist;
    }

    public Specialist? Update(Guid id, string name, string category, string? description, string? imageUrl, decimal pricePerHour, int rating)
    {
        var specialist = GetById(id);
        if (specialist == null) return null;

        _specialists.Remove(specialist);
        var updated = new Specialist
        {
            Id = id,
            UserId = specialist.UserId,
            Name = name,
            Category = category,
            Description = description,
            ImageUrl = imageUrl,
            PricePerHour = pricePerHour,
            Rating = Math.Clamp(rating, 1, 5),
            CreatedAt = specialist.CreatedAt
        };

        _specialists.Add(updated);
        return updated;
    }

    public bool Delete(Guid id)
    {
        var specialist = GetById(id);
        if (specialist == null) return false;

        _specialists.Remove(specialist);
        return true;
    }
}

