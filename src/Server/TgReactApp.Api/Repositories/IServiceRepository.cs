using TgReactApp.Api.Models;

namespace TgReactApp.Api.Repositories;

public interface IServiceRepository
{
    List<Service> GetAll();
    List<Service> GetByCategory(string category);
    List<Service> GetBySpecialist(Guid specialistId);
    Service? GetById(Guid id);
    Service Add(string name, string category, int durationMinutes, decimal price, string? description, Guid? specialistId = null, Guid? createdByUserId = null);
    Service? Update(Guid id, string name, string category, int durationMinutes, decimal price, string? description, Guid? specialistId = null, Guid? createdByUserId = null);
    bool Delete(Guid id);
}

public class InMemoryServiceRepository : IServiceRepository
{
    private readonly List<Service> _services = new()
    {
        // Hair Services
        new Service
        {
            Id = Guid.Parse("a1111111-1111-1111-1111-111111111111"),
            Name = "Women's Haircut",
            Category = "Hair",
            DurationMinutes = 45,
            Price = 50,
            Description = "Professional haircut and styling",
            CreatedAt = DateTime.UtcNow
        },
        new Service
        {
            Id = Guid.Parse("a2222222-2222-2222-2222-222222222222"),
            Name = "Men's Haircut",
            Category = "Hair",
            DurationMinutes = 30,
            Price = 35,
            Description = "Classic men's haircut",
            CreatedAt = DateTime.UtcNow
        },
        new Service
        {
            Id = Guid.Parse("a3333333-3333-3333-3333-333333333333"),
            Name = "Hair Coloring",
            Category = "Hair",
            DurationMinutes = 120,
            Price = 120,
            Description = "Full hair coloring service",
            CreatedAt = DateTime.UtcNow
        },
        new Service
        {
            Id = Guid.Parse("a4444444-4444-4444-4444-444444444444"),
            Name = "Balayage",
            Category = "Hair",
            DurationMinutes = 180,
            Price = 180,
            Description = "Balayage highlights",
            CreatedAt = DateTime.UtcNow
        },
        // Nail Services
        new Service
        {
            Id = Guid.Parse("b1111111-1111-1111-1111-111111111111"),
            Name = "Classic Manicure",
            Category = "Nails",
            DurationMinutes = 30,
            Price = 25,
            Description = "Traditional manicure",
            CreatedAt = DateTime.UtcNow
        },
        new Service
        {
            Id = Guid.Parse("b2222222-2222-2222-2222-222222222222"),
            Name = "Gel Manicure",
            Category = "Nails",
            DurationMinutes = 45,
            Price = 40,
            Description = "Long-lasting gel manicure",
            CreatedAt = DateTime.UtcNow
        },
        new Service
        {
            Id = Guid.Parse("b3333333-3333-3333-3333-333333333333"),
            Name = "Pedicure",
            Category = "Nails",
            DurationMinutes = 60,
            Price = 45,
            Description = "Relaxing pedicure service",
            CreatedAt = DateTime.UtcNow
        },
        new Service
        {
            Id = Guid.Parse("b4444444-4444-4444-4444-444444444444"),
            Name = "Nail Art",
            Category = "Nails",
            DurationMinutes = 90,
            Price = 65,
            Description = "Custom nail art design",
            CreatedAt = DateTime.UtcNow
        },
        // Makeup Services
        new Service
        {
            Id = Guid.Parse("c1111111-1111-1111-1111-111111111111"),
            Name = "Everyday Makeup",
            Category = "Makeup",
            DurationMinutes = 45,
            Price = 60,
            Description = "Natural everyday look",
            CreatedAt = DateTime.UtcNow
        },
        new Service
        {
            Id = Guid.Parse("c2222222-2222-2222-2222-222222222222"),
            Name = "Special Event Makeup",
            Category = "Makeup",
            DurationMinutes = 90,
            Price = 100,
            Description = "Glamorous makeup for special occasions",
            CreatedAt = DateTime.UtcNow
        },
        new Service
        {
            Id = Guid.Parse("c3333333-3333-3333-3333-333333333333"),
            Name = "Bridal Makeup",
            Category = "Makeup",
            DurationMinutes = 120,
            Price = 150,
            Description = "Complete bridal makeup package",
            CreatedAt = DateTime.UtcNow
        }
    };

    public List<Service> GetAll() => _services.ToList();

    public List<Service> GetByCategory(string category) =>
        _services.Where(s => s.Category.Equals(category, StringComparison.OrdinalIgnoreCase)).ToList();

    public Service? GetById(Guid id) => _services.FirstOrDefault(s => s.Id == id);

    public List<Service> GetBySpecialist(Guid specialistId) =>
        _services.Where(s => s.SpecialistId == specialistId).ToList();

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

        _services.Add(service);
        return service;
    }

    public Service? Update(Guid id, string name, string category, int durationMinutes, decimal price, string? description, Guid? specialistId = null, Guid? createdByUserId = null)
    {
        var service = GetById(id);
        if (service == null) return null;

        _services.Remove(service);
        var updated = new Service
        {
            Id = id,
            Name = name,
            Category = category,
            DurationMinutes = durationMinutes,
            Price = price,
            Description = description,
            SpecialistId = specialistId,
            CreatedByUserId = service.CreatedByUserId, // Keep original creator
            CreatedAt = service.CreatedAt
        };

        _services.Add(updated);
        return updated;
    }

    public bool Delete(Guid id)
    {
        var service = GetById(id);
        if (service == null) return false;

        _services.Remove(service);
        return true;
    }
}

