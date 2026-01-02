using Microsoft.EntityFrameworkCore;
using TgReactApp.Api.Data;
using TgReactApp.Api.Models;

namespace TgReactApp.Api.Repositories;

// ClientRepository now works with Users (Clients merged into Users)
public class EfClientRepository : IClientRepository
{
    private readonly GlowBookDbContext _context;

    public EfClientRepository(GlowBookDbContext context)
    {
        _context = context;
    }

    // Return Users as Clients (using client fields from User model)
    public List<Client> GetAll() => 
        _context.Users
            .Where(u => u.Email != null) // Only users with email (clients)
            .Select(u => new Client
            {
                Id = u.Id,
                Name = u.Name ?? u.DisplayName ?? u.Username,
                Email = u.Email ?? "",
                Phone = u.Phone,
                Notes = u.Notes,
                CreatedAt = u.CreatedAt
            })
            .ToList();

    public Client? GetById(Guid id)
    {
        var user = _context.Users.Find(id);
        if (user == null || user.Email == null) return null;
        
        return new Client
        {
            Id = user.Id,
            Name = user.Name ?? user.DisplayName ?? user.Username,
            Email = user.Email,
            Phone = user.Phone,
            Notes = user.Notes,
            CreatedAt = user.CreatedAt
        };
    }

        public Client? GetByEmail(string email)
    {
        var user = _context.Users
            .FirstOrDefault(u => u.Email != null && u.Email.ToLower() == email.ToLower());
        
        if (user == null) return null;
        
        return new Client
        {
            Id = user.Id,
            Name = user.Name ?? user.DisplayName ?? user.Username,
            Email = user.Email!,
            Phone = user.Phone,
            Notes = user.Notes,
            CreatedAt = user.CreatedAt
        };
    }

    public Client Add(string name, string email, string? phone, string? notes)
    {
        // Check if user with this email already exists
        var existingUser = _context.Users
            .FirstOrDefault(u => u.Email != null && u.Email.ToLower() == email.ToLower());
        
        if (existingUser != null)
        {
            // Update existing user with client info
            existingUser.Name = name;
            existingUser.Phone = phone;
            existingUser.Notes = notes;
            _context.SaveChanges();
            
            return new Client
            {
                Id = existingUser.Id,
                Name = existingUser.Name ?? existingUser.DisplayName ?? existingUser.Username,
                Email = existingUser.Email ?? "",
                Phone = existingUser.Phone,
                Notes = existingUser.Notes,
                CreatedAt = existingUser.CreatedAt
            };
        }

        // Create new user as client (without username/password - they can be set later)
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = $"client_{Guid.NewGuid():N}", // Temporary username
            PasswordHash = "", // Empty - can be set when they register
            Name = name,
            Email = email,
            Phone = phone,
            Notes = notes,
            IsAdmin = false,
            IsSpecialist = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        _context.SaveChanges();
        
        return new Client
        {
            Id = user.Id,
            Name = user.Name ?? user.DisplayName ?? user.Username,
            Email = user.Email ?? "",
            Phone = user.Phone,
            Notes = user.Notes,
            CreatedAt = user.CreatedAt
        };
    }

    public Client? Update(Guid id, string name, string email, string? phone, string? notes)
    {
        var user = _context.Users.Find(id);
        if (user == null) return null;

        user.Name = name;
        user.Email = email;
        user.Phone = phone;
        user.Notes = notes;

        _context.SaveChanges();
        
        return new Client
        {
            Id = user.Id,
            Name = user.Name ?? user.DisplayName ?? user.Username,
            Email = user.Email ?? "",
            Phone = user.Phone,
            Notes = user.Notes,
            CreatedAt = user.CreatedAt
        };
    }

    public bool Delete(Guid id)
    {
        var user = _context.Users.Find(id);
        if (user == null) return false;

        // Only delete if not a registered user (no password hash)
        if (string.IsNullOrEmpty(user.PasswordHash))
        {
            _context.Users.Remove(user);
            _context.SaveChanges();
            return true;
        }
        
        // If registered user, just clear client fields
        user.Name = null!;
        user.Email = null!;
        user.Phone = null!;
        user.Notes = null!;
        _context.SaveChanges();
        return true;
    }
}

public class EfClientServicePriceRepository : IClientServicePriceRepository
{
    private readonly GlowBookDbContext _context;

    public EfClientServicePriceRepository(GlowBookDbContext context)
    {
        _context = context;
    }

    public List<ClientServicePrice> GetByClient(Guid clientId) =>
        _context.ClientServicePrices
            .Where(p => p.ClientId == clientId)
            .ToList();

    public ClientServicePrice? GetClientServicePrice(Guid clientId, Guid serviceId) =>
        _context.ClientServicePrices
            .FirstOrDefault(p => p.ClientId == clientId && p.ServiceId == serviceId);

    public ClientServicePrice SetPrice(Guid clientId, Guid serviceId, decimal customPrice)
    {
        var existing = GetClientServicePrice(clientId, serviceId);
        
        if (existing != null)
        {
            existing.CustomPrice = customPrice;
            _context.SaveChanges();
            return existing;
        }

        var price = new ClientServicePrice
        {
            Id = Guid.NewGuid(),
            ClientId = clientId,
            ServiceId = serviceId,
            CustomPrice = customPrice,
            CreatedAt = DateTime.UtcNow
        };

        _context.ClientServicePrices.Add(price);
        _context.SaveChanges();
        return price;
    }

    public bool DeletePrice(Guid clientId, Guid serviceId)
    {
        var price = GetClientServicePrice(clientId, serviceId);
        if (price == null) return false;

        _context.ClientServicePrices.Remove(price);
        _context.SaveChanges();
        return true;
    }

    public List<ClientServicePrice> GetAllPricesForClient(Guid clientId) =>
        GetByClient(clientId);
}

