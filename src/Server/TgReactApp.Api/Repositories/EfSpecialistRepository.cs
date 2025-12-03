using Microsoft.EntityFrameworkCore;
using TgReactApp.Api.Data;
using TgReactApp.Api.Models;

namespace TgReactApp.Api.Repositories;

public class EfSpecialistRepository : ISpecialistRepository
{
    private readonly GlowBookDbContext _context;

    public EfSpecialistRepository(GlowBookDbContext context)
    {
        _context = context;
    }

    public List<Specialist> GetAll() => _context.Specialists.ToList();

    public List<Specialist> GetByCategory(string category) =>
        _context.Specialists
            .Where(s => s.Category.Equals(category, StringComparison.OrdinalIgnoreCase))
            .ToList();

    public Specialist? GetById(Guid id) => _context.Specialists.Find(id);

    public Specialist? GetByUserId(Guid userId) =>
        _context.Specialists
            .FirstOrDefault(s => s.UserId == userId);

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

        _context.Specialists.Add(specialist);
        _context.SaveChanges();
        return specialist;
    }

    public Specialist? Update(Guid id, string name, string category, string? description, string? imageUrl, decimal pricePerHour, int rating)
    {
        var specialist = GetById(id);
        if (specialist == null) return null;

        specialist.Name = name;
        specialist.Category = category;
        specialist.Description = description;
        specialist.ImageUrl = imageUrl;
        specialist.PricePerHour = pricePerHour;
        specialist.Rating = Math.Clamp(rating, 1, 5);

        _context.SaveChanges();
        return specialist;
    }

    public bool Delete(Guid id)
    {
        var specialist = GetById(id);
        if (specialist == null) return false;

        _context.Specialists.Remove(specialist);
        _context.SaveChanges();
        return true;
    }
}

