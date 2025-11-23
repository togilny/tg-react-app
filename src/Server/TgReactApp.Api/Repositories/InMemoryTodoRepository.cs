using System.Collections.Concurrent;
using TgReactApp.Api.Models;

namespace TgReactApp.Api.Repositories;

public sealed class InMemoryTodoRepository : ITodoRepository
{
    private readonly ConcurrentDictionary<Guid, TodoItem> _state = new();

    public InMemoryTodoRepository()
    {
        var seed = new[]
        {
            ("Plan sprint demo", "Review the core flows with the team"),
            ("Record walkthrough", "Short demo video for stakeholders"),
            ("Write release notes", "Highlight new API endpoints and React UI")
        };

        foreach (var (title, description) in seed)
        {
            Add(title, description);
        }
    }

    public IReadOnlyCollection<TodoItem> GetAll()
        => _state.Values
            .OrderBy(t => t.CreatedAt)
            .ToList();

    public TodoItem? GetById(Guid id)
        => _state.TryGetValue(id, out var value) ? value : null;

    public TodoItem Add(string title, string? description)
    {
        var item = new TodoItem(
            Guid.NewGuid(),
            title.Trim(),
            string.IsNullOrWhiteSpace(description) ? null : description.Trim(),
            false,
            DateTime.UtcNow,
            null);

        _state[item.Id] = item;
        return item;
    }

    public TodoItem? Update(Guid id, string title, string? description, bool isComplete)
    {
        if (!_state.TryGetValue(id, out var existing))
        {
            return null;
        }

        var updated = existing with
        {
            Title = title.Trim(),
            Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim(),
            IsComplete = isComplete,
            CompletedAt = isComplete ? existing.CompletedAt ?? DateTime.UtcNow : null
        };

        _state[id] = updated;
        return updated;
    }

    public bool Delete(Guid id)
        => _state.TryRemove(id, out _);
}

