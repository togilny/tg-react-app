using System.Collections.Concurrent;
using TgReactApp.Api.Models;

namespace TgReactApp.Api.Repositories;

public sealed class InMemoryNoteRepository : INoteRepository
{
    private readonly ConcurrentDictionary<Guid, Note> _notes = new();

    public IReadOnlyCollection<Note> GetAllByUser(Guid userId)
        => _notes.Values
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.UpdatedAt)
            .ToList();

    public Note? GetById(Guid id, Guid userId)
    {
        if (_notes.TryGetValue(id, out var note) && note.UserId == userId)
        {
            return note;
        }
        return null;
    }

    public Note Add(Guid userId, string title, string content)
    {
        var now = DateTime.UtcNow;
        var note = new Note(
            Guid.NewGuid(),
            userId,
            title.Trim(),
            content.Trim(),
            now,
            now);

        _notes[note.Id] = note;
        return note;
    }

    public Note? Update(Guid id, Guid userId, string title, string content)
    {
        if (!_notes.TryGetValue(id, out var existing) || existing.UserId != userId)
        {
            return null;
        }

        var updated = existing with
        {
            Title = title.Trim(),
            Content = content.Trim(),
            UpdatedAt = DateTime.UtcNow
        };

        _notes[id] = updated;
        return updated;
    }

    public bool Delete(Guid id, Guid userId)
    {
        if (_notes.TryGetValue(id, out var note) && note.UserId == userId)
        {
            return _notes.TryRemove(id, out _);
        }
        return false;
    }
}

