<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Faq;
use App\Models\Book;
use Illuminate\Http\Request;

class FaqController extends Controller
{
    // Listado de FAQs, opcionalmente filtrados por libro
    public function index(Request $request)
    {
        $bookFilter = $request->input('book_filter');
        if ($bookFilter) {
            $faqs = Faq::with('book')
                ->where('book_id', $bookFilter)
                ->orderBy('order')
                ->get();
        } else {
            $faqs = Faq::with('book')
                ->orderBy('book_id')
                ->orderBy('order')
                ->get();
        }
        return response()->json($faqs);
    }

    // Crear un nuevo FAQ
    public function store(Request $request)
    {
        $validated = $request->validate([
            'book_id' => 'required|exists:books,id',
            'question' => 'required|string|max:255',
            'answer' => 'required|string',
            'order' => 'nullable|integer|min:0',
        ]);

        // If order is not provided, assign the next available order for the book
        if (!isset($validated['order'])) {
            $maxOrder = Faq::where('book_id', $validated['book_id'])->max('order');
            $validated['order'] = $maxOrder !== null ? $maxOrder + 1 : 0;
        }

        $faq = Faq::create($validated);
        
        // Load the book relationship for the response
        $faq->load('book');
        return response()->json($faq, 201);
    }

    // Mostrar un FAQ específico (con su libro)
    public function show(Faq $faq)
    {
        $faq->load('book');
        return response()->json($faq);
    }

    // Actualizar un FAQ
    public function update(Request $request, Faq $faq)
    {
        $validated = $request->validate([
            'book_id' => 'required|exists:books,id',
            'question' => 'required|string|max:255',
            'answer' => 'required|string',
            'order' => 'required|integer|min:0',
        ]);

        $faq->update($validated);
        
        // Load the book relationship for the response
        $faq->load('book');
        return response()->json($faq);
    }

    // Eliminar un FAQ
    public function destroy(Faq $faq)
    {
        $faq->delete();
        return response()->json(null, 204);
    }
    
    // Display FAQs for a specific book
    public function bookFaqs(Book $book)
    {
        $faqs = $book->faqs()->orderBy('order')->get();
        return response()->json([
            'book' => $book,
            'faqs' => $faqs
        ]);
    }
    
    // Reorder FAQs for a specific book
    public function reorder(Request $request, Book $book)
    {
        $request->validate([
            'orders' => 'required|array',
            'orders.*' => 'required|integer|exists:faqs,id',
        ]);
        
        $orders = $request->orders;
        
        // Update the order of each FAQ
        foreach ($orders as $index => $faqId) {
            Faq::where('id', $faqId)->update(['order' => $index]);
        }
        
        return response()->json(['success' => true]);
    }
}