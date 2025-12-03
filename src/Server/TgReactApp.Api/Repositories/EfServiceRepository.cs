using Microsoft.EntityFrameworkCore;
using TgReactApp.Api.Data;
using TgReactApp.Api.Models;

namespace TgReactApp.Api.Repositories;

public class EfServiceRepository : IServiceRepository
{
    private readonly GlowBookDbContext _context;

    public EfServiceRepository(GlowBookDbContext context)
    {
        _context = context;
    }

    public List<Service> GetAll() => _context.Services.ToList();

    public List<Service> GetByCategory(string category) =>
        _context.Services
            .Where(s => s.Category.Equals(category, StringComparison.OrdinalIgnoreCase))
            .ToList();

    public List<Service> GetBySpecialist(Guid specialistId) =>
        _context.Services
            .Where(s => s.SpecialistId == specialistId || s.SpecialistId == null)
            .ToList();

    public Service? GetById(Guid id) => _context.Services.Find(id);

    public Service Add(string name, string category, int durationMinutes, decimal price, string? description, Guid? specialistId = null, Guid? createdByUserId = null)
    {
        var service = new Service
        {
            Id = Guid.NewGuid(),
            Name = name,
            Category = category,
            DurationMinutes = durationMinutes,
            Price = price,
            Description = description,
            SpecialistId = specialistId,
            CreatedByUserId = createdByUserId,
            CreatedAt = DateTime.UtcNow
        };

        _context.Services.Add(service);
        _context.SaveChanges();
        return service;
    }

    public Service? Update(Guid id, string name, string category, int durationMinutes, decimal price, string? description, Guid? specialistId = null, Guid? createdByUserId = null)
    {
        var service = GetById(id);
        if (service == null) return null;

        service.Name = name;
        service.Category = category;
        service.DurationMinutes = durationMinutes;
        service.Price = price;
        service.Description = description;
        service.SpecialistId = specialistId;
        // Don't update CreatedByUserId - keep the original creator

        _context.SaveChanges();
        return service;
    }

    public bool Delete(Guid id)
    {
        var service = GetById(id);
        if (service == null) return false;

        _context.Services.Remove(service);
        _context.SaveChanges();
        return true;
    }
}

