<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Author;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AuthorController extends Controller
{
    // Listado de autores, opcionalmente filtrados y cargando los libros asociados
    public function index(Request $request)
    {
        $bookFilter = $request->input('book_filter');
        if ($bookFilter) {
            $authors = Author::with('books')
                ->whereHas('books', function ($query) use ($bookFilter) {
                    $query->where('book_id', $bookFilter);
                })->get();
        } else {
            $authors = Author::with('books')->get();
        }
        return response()->json($authors);
    }

    // Crear un autor y asociando libros (si se envían)
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'bio' => 'required|string',
            'image' => 'nullable|image|max:2048',
        ]);

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('authors', 'public');
            $validated['image'] = $path;
        } else {
            $validated['image'] = null;
        }

        $author = Author::create($validated);

        // Asociar libros, si se envían en la petición
        if ($request->has('books')) {
            $author->books()->sync($request->books);
        }

        // Cargamos los libros para devolver el autor completo
        $author->load('books');
        return response()->json($author, 201);
    }

    // Mostrar un autor específico (con sus libros)
    public function show(Author $author)
    {
        $author->load('books');
        return response()->json($author);
    }

    // Actualizar un autor y asociando libros (si se envían)
    public function update(Request $request, Author $author)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'bio' => 'required|string',
            'image' => 'nullable|image|max:2048',
        ]);

        if ($request->hasFile('image')) {
            // Delete old image if it exists
            if ($author->image) {
                Storage::disk('public')->delete($author->image);
            }
            
            $path = $request->file('image')->store('authors', 'public');
            $validated['image'] = $path;
        } elseif ($request->has('remove_image') && $request->remove_image) {
            // Delete old image if exists and user wants to remove it
            if ($author->image) {
                Storage::disk('public')->delete($author->image);
            }
            $validated['image'] = null;
        } else {
            // If no new image is uploaded and no removal is requested, keep the old image
            unset($validated['image']);
        }

        $author->update($validated);

        if ($request->has('books')) {
            $author->books()->sync($request->books);
        }

        $author->load('books');
        return response()->json($author);
    }

    // Eliminar un autor
    public function destroy(Author $author)
    {
        // Check if author has books
        if ($author->books()->count() > 0) {
            return response()->json([
                'error' => 'Cannot delete author with associated books.'
            ], 422);
        }

        // Delete author image if it exists
        if ($author->image) {
            Storage::disk('public')->delete($author->image);
        }

        $author->delete();
        return response()->json(null, 204);
    }
}
