<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Testimonial;
use App\Models\Book;
use Illuminate\Http\Request;

class TestimonialController extends Controller
{
    /**
     * Display a listing of testimonials, optionally filtered by book.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        $bookFilter = $request->input('book_filter');
        if ($bookFilter) {
            $testimonials = Testimonial::with('book')
                ->where('book_id', $bookFilter)
                ->get();
        } else {
            $testimonials = Testimonial::with('book')->get();
        }
        return response()->json($testimonials);
    }

    /**
     * Store a newly created testimonial in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'book_id' => 'required|exists:books,id',
            'name' => 'required|string|max:255',
            'text' => 'required|string',
            'rating' => 'required|integer|min:1|max:5',
        ]);

        $testimonial = Testimonial::create($validated);
        
        // Load the related book for the response
        $testimonial->load('book');
        
        return response()->json($testimonial, 201);
    }

    /**
     * Display the specified testimonial.
     *
     * @param  \App\Models\Testimonial  $testimonial
     * @return \Illuminate\Http\Response
     */
    public function show(Testimonial $testimonial)
    {
        $testimonial->load('book');
        return response()->json($testimonial);
    }

    /**
     * Update the specified testimonial in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Testimonial  $testimonial
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, Testimonial $testimonial)
    {
        $validated = $request->validate([
            'book_id' => 'required|exists:books,id',
            'name' => 'required|string|max:255',
            'text' => 'required|string',
            'rating' => 'required|integer|min:1|max:5',
        ]);

        $testimonial->update($validated);
        
        // Load the related book for the response
        $testimonial->load('book');
        
        return response()->json($testimonial);
    }

    /**
     * Remove the specified testimonial from storage.
     *
     * @param  \App\Models\Testimonial  $testimonial
     * @return \Illuminate\Http\Response
     */
    public function destroy(Testimonial $testimonial)
    {
        $testimonial->delete();
        return response()->json(null, 204);
    }

    /**
     * Display testimonials for a specific book.
     *
     * @param  \App\Models\Book  $book
     * @return \Illuminate\Http\Response
     */
    public function bookTestimonials(Book $book)
    {
        $testimonials = $book->testimonials;
        return response()->json([
            'book' => $book,
            'testimonials' => $testimonials
        ]);
    }
}