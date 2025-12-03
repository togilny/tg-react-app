using Microsoft.EntityFrameworkCore;
using TgReactApp.Api.Data;
using TgReactApp.Api.Models;

namespace TgReactApp.Api.Repositories;

public class EfClientRepository : IClientRepository
{
    private readonly GlowBookDbContext _context;

    public EfClientRepository(GlowBookDbContext context)
    {
        _context = context;
    }

    public List<Client> GetAll() => _context.Clients.ToList();

    public Client? GetById(Guid id) => _context.Clients.Find(id);

    public Client? GetByEmail(string email) =>
        _context.Clients
            .FirstOrDefault(c => c.Email.ToLower() == email.ToLower());

    public Client Add(string name, string email, string? phone, string? notes)
    {
        var client = new Client
        {
            Id = Guid.NewGuid(),
            Name = name,
            Email = email,
            Phone = phone,
            Notes = notes,
            CreatedAt = DateTime.UtcNow
        };

        _context.Clients.Add(client);
        _context.SaveChanges();
        return client;
    }

    public Client? Update(Guid id, string name, string email, string? phone, string? notes)
    {
        var client = GetById(id);
        if (client == null) return null;

        client.Name = name;
        client.Email = email;
        client.Phone = phone;
        client.Notes = notes;

        _context.SaveChanges();
        return client;
    }

    public bool Delete(Guid id)
    {
        var client = GetById(id);
        if (client == null) return false;

        _context.Clients.Remove(client);
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

