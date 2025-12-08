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

    // New method to get services with specialist information (from Users where IsSpecialist = true)
    public List<ServiceResponse> GetAllWithSpecialistInfo()
    {
        return (from s in _context.Services
                join specialistUser in _context.Users on s.SpecialistId equals specialistUser.Id into specialistJoin
                from specialistUser in specialistJoin.DefaultIfEmpty()
                join creatorUser in _context.Users on s.CreatedByUserId equals creatorUser.Id into creatorJoin
                from creatorUser in creatorJoin.DefaultIfEmpty()
                // Don't filter here - include all services, specialist info will be null if not a specialist
                select new ServiceResponse
                {
                    Id = s.Id,
                    Name = s.Name,
                    Category = s.Category,
                    DurationMinutes = s.DurationMinutes,
                    Price = s.Price,
                    Description = s.Description,
                    SpecialistId = s.SpecialistId,
                    SpecialistDisplayName = s.SpecialistId != null && specialistUser != null && specialistUser.IsSpecialist
                        ? (specialistUser.DisplayName ?? specialistUser.Name ?? specialistUser.Username)
                        : null,
                    CreatedByUserId = s.CreatedByUserId,
                    CreatedByDisplayName = creatorUser != null
                        ? (creatorUser.DisplayName ?? creatorUser.Name ?? creatorUser.Username)
                        : null,
                    CreatedAt = s.CreatedAt
                })
                .ToList();
    }

    // Get services for a specific specialist with display name
    public List<ServiceResponse> GetBySpecialistWithInfo(Guid specialistId)
    {
        return (from s in _context.Services
                join specialistUser in _context.Users on s.SpecialistId equals specialistUser.Id into specialistJoin
                from specialistUser in specialistJoin.DefaultIfEmpty()
                join creatorUser in _context.Users on s.CreatedByUserId equals creatorUser.Id into creatorJoin
                from creatorUser in creatorJoin.DefaultIfEmpty()
                where s.SpecialistId == specialistId
                select new ServiceResponse
                {
                    Id = s.Id,
                    Name = s.Name,
                    Category = s.Category,
                    DurationMinutes = s.DurationMinutes,
                    Price = s.Price,
                    Description = s.Description,
                    SpecialistId = s.SpecialistId,
                    SpecialistDisplayName = specialistUser != null && specialistUser.IsSpecialist
                        ? (specialistUser.DisplayName ?? specialistUser.Name ?? specialistUser.Username)
                        : null,
                    CreatedByUserId = s.CreatedByUserId,
                    CreatedByDisplayName = creatorUser != null
                        ? (creatorUser.DisplayName ?? creatorUser.Name ?? creatorUser.Username)
                        : null,
                    CreatedAt = s.CreatedAt
                })
                .ToList();
    }

    // Get service by ID with specialist information
    public ServiceResponse? GetByIdWithSpecialistInfo(Guid id)
    {
        var service = _context.Services.Find(id);
        if (service == null) return null;

        string? specialistDisplayName = null;
        if (service.SpecialistId != null)
        {
            var specialistUser = _context.Users.Find(service.SpecialistId);
            if (specialistUser != null && specialistUser.IsSpecialist)
            {
                specialistDisplayName = specialistUser.DisplayName ?? specialistUser.Name ?? specialistUser.Username;
            }
        }

        string? createdByDisplayName = null;
        if (service.CreatedByUserId != null)
        {
            var creatorUser = _context.Users.Find(service.CreatedByUserId);
            if (creatorUser != null)
            {
                createdByDisplayName = creatorUser.DisplayName ?? creatorUser.Name ?? creatorUser.Username;
            }
        }

        return new ServiceResponse
        {
            Id = service.Id,
            Name = service.Name,
            Category = service.Category,
            DurationMinutes = service.DurationMinutes,
            Price = service.Price,
            Description = service.Description,
            SpecialistId = service.SpecialistId,
            SpecialistDisplayName = specialistDisplayName,
            CreatedByUserId = service.CreatedByUserId,
            CreatedByDisplayName = createdByDisplayName,
            CreatedAt = service.CreatedAt
        };
    }

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

