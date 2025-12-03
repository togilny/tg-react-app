using TgReactApp.Api.Models;

namespace TgReactApp.Api.Repositories;

public interface IClientRepository
{
    List<Client> GetAll();
    Client? GetById(Guid id);
    Client? GetByEmail(string email);
    Client Add(string name, string email, string? phone, string? notes);
    Client? Update(Guid id, string name, string email, string? phone, string? notes);
    bool Delete(Guid id);
}

public class InMemoryClientRepository : IClientRepository
{
    private readonly List<Client> _clients = new();

    public List<Client> GetAll() => _clients.ToList();

    public Client? GetById(Guid id) => _clients.FirstOrDefault(c => c.Id == id);

    public Client? GetByEmail(string email) => 
        _clients.FirstOrDefault(c => c.Email.Equals(email, StringComparison.OrdinalIgnoreCase));

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

        _clients.Add(client);
        return client;
    }

    public Client? Update(Guid id, string name, string email, string? phone, string? notes)
    {
        var client = GetById(id);
        if (client == null) return null;

        _clients.Remove(client);
        var updated = new Client
        {
            Id = id,
            Name = name,
            Email = email,
            Phone = phone,
            Notes = notes,
            CreatedAt = client.CreatedAt
        };

        _clients.Add(updated);
        return updated;
    }

    public bool Delete(Guid id)
    {
        var client = GetById(id);
        if (client == null) return false;

        _clients.Remove(client);
        return true;
    }
}

public interface IClientServicePriceRepository
{
    List<ClientServicePrice> GetByClient(Guid clientId);
    ClientServicePrice? GetClientServicePrice(Guid clientId, Guid serviceId);
    ClientServicePrice SetPrice(Guid clientId, Guid serviceId, decimal customPrice);
    bool DeletePrice(Guid clientId, Guid serviceId);
    List<ClientServicePrice> GetAllPricesForClient(Guid clientId);
}

public class InMemoryClientServicePriceRepository : IClientServicePriceRepository
{
    private readonly List<ClientServicePrice> _prices = new();

    public List<ClientServicePrice> GetByClient(Guid clientId) =>
        _prices.Where(p => p.ClientId == clientId).ToList();

    public ClientServicePrice? GetClientServicePrice(Guid clientId, Guid serviceId) =>
        _prices.FirstOrDefault(p => p.ClientId == clientId && p.ServiceId == serviceId);

    public ClientServicePrice SetPrice(Guid clientId, Guid serviceId, decimal customPrice)
    {
        var existing = GetClientServicePrice(clientId, serviceId);
        
        if (existing != null)
        {
            _prices.Remove(existing);
        }

        var price = new ClientServicePrice
        {
            Id = Guid.NewGuid(),
            ClientId = clientId,
            ServiceId = serviceId,
            CustomPrice = customPrice,
            CreatedAt = DateTime.UtcNow
        };

        _prices.Add(price);
        return price;
    }

    public bool DeletePrice(Guid clientId, Guid serviceId)
    {
        var price = GetClientServicePrice(clientId, serviceId);
        if (price == null) return false;

        _prices.Remove(price);
        return true;
    }

    public List<ClientServicePrice> GetAllPricesForClient(Guid clientId) =>
        GetByClient(clientId);
}

