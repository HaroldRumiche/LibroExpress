import { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { PlusCircle, Pencil, Trash2, BookOpen, X } from 'lucide-react';

const breadcrumbs = [
    {
        title: 'Authors',
        href: '/authors',
    },
];

export default function Authors() {
    const [authors, setAuthors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [currentAuthor, setCurrentAuthor] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        bio: '',
        image: null,
        books: [],
        remove_image: false
    });
    const [errors, setErrors] = useState({});
    const [bookFilter, setBookFilter] = useState('');
    const [availableBooks, setAvailableBooks] = useState([]);

    // Get CSRF token
    const getCsrfToken = () => {
        return document.querySelector('meta[name="csrf-token"]')?.content || '';
    };

    // Fetch authors on load and when book filter changes
    useEffect(() => {
        fetchAuthors();
        fetchBooks();
    }, [bookFilter]);

    const fetchAuthors = async () => {
        setLoading(true);
        try {
            const url = bookFilter 
                ? `/api/authors?book_filter=${encodeURIComponent(bookFilter)}` 
                : '/api/authors';
            
            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken()
                },
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`Error fetching authors: ${response.status}`);
            }
            
            const data = await response.json();
            setAuthors(data);
        } catch (error) {
            console.error('Error fetching authors:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBooks = async () => {
        try {
            const response = await fetch('/api/books', {
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken()
                },
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`Error fetching books: ${response.status}`);
            }
            
            const data = await response.json();
            setAvailableBooks(data);
        } catch (error) {
            console.error('Error fetching books:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleImageChange = (e) => {
        setFormData({ ...formData, image: e.target.files[0] });
    };

    const handleRemoveImage = () => {
        setFormData({ ...formData, remove_image: true });
    };

    const handleBookToggle = (bookId) => {
        const updatedBooks = formData.books.includes(bookId)
            ? formData.books.filter(id => id !== bookId)
            : [...formData.books, bookId];
        setFormData({ ...formData, books: updatedBooks });
    };

    const resetForm = () => {
        setFormData({
            name: '',
            bio: '',
            image: null,
            books: [],
            remove_image: false
        });
        setErrors({});
        setCurrentAuthor(null);
    };

    const openNewAuthorForm = () => {
        resetForm();
        setShowForm(true);
    };

    const openEditAuthorForm = (author) => {
        setCurrentAuthor(author);
        setFormData({
            name: author.name,
            bio: author.bio,
            image: null,
            books: author.books.map(book => book.id),
            remove_image: false
        });
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        resetForm();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});

        const formPayload = new FormData();
        formPayload.append('name', formData.name);
        formPayload.append('bio', formData.bio);
        
        if (formData.image) {
            formPayload.append('image', formData.image);
        }
        
        if (formData.remove_image) {
            formPayload.append('remove_image', '1');
        }
        
        formData.books.forEach(bookId => {
            formPayload.append('books[]', bookId);
        });

        try {
            let response;
            
            if (currentAuthor) {
                // Update existing author - using Laravel's method spoofing
                formPayload.append('_method', 'PUT');
                
                response = await fetch(`/api/authors/${currentAuthor.id}`, {
                    method: 'POST',
                    body: formPayload,
                    headers: {
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': getCsrfToken()
                    },
                    credentials: 'include'
                });
            } else {
                // Create new author
                response = await fetch('/api/authors', {
                    method: 'POST',
                    body: formPayload,
                    headers: {
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': getCsrfToken()
                    },
                    credentials: 'include'
                });
            }

            const data = await response.json();
            console.log('Response data:', data);

            if (response.status === 422) {
                setErrors(data.errors || {});
                return;
            }

            if (!response.ok) {
                console.error('Server error:', data);
                throw new Error(`Network response was not ok: ${response.status}`);
            }

            await fetchAuthors();
            closeForm();
        } catch (error) {
            console.error('Error saving author:', error);
        }
    };

    const deleteAuthor = async (author) => {
        if (!confirm(`Are you sure you want to delete ${author.name}?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/authors/${author.id}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken()
                },
                credentials: 'include'
            });

            let data = {};
            if (response.status !== 204) {
                data = await response.json();
            }

            if (response.status === 422) {
                alert(data.error || 'Cannot delete this author.');
                return;
            }

            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.status}`);
            }

            await fetchAuthors();
        } catch (error) {
            console.error('Error deleting author:', error);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Authors Management" />
            
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold">Authors Management</h1>
                    <button 
                        onClick={openNewAuthorForm}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                    >
                        <PlusCircle size={20} /> 
                        <span>Add Author</span>
                    </button>
                </div>

                {/* Filter by book */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Filter by Book:</label>
                    <select 
                        value={bookFilter} 
                        onChange={(e) => setBookFilter(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2"
                    >
                        <option value="">All Authors</option>
                        {availableBooks.map(book => (
                            <option key={book.id} value={book.id}>{book.title}</option>
                        ))}
                    </select>
                </div>

                {/* Authors List */}
                {loading ? (
                    <div className="text-center py-12">Loading authors...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {authors.length === 0 ? (
                            <div className="col-span-3 text-center py-12 text-gray-500">
                                No authors found. Add your first author!
                            </div>
                        ) : (
                            authors.map(author => (
                                <div key={author.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                                    <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative">
                                        {author.image ? (
                                            <img 
                                                src={`/storage/${author.image}`} 
                                                alt={author.name} 
                                                className="object-cover w-full h-full"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-gray-400">
                                                No image available
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4">
                                        <h3 className="text-lg font-semibold mb-2">{author.name}</h3>
                                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-3">
                                            {author.bio}
                                        </p>
                                        
                                        <div className="mb-4">
                                            <h4 className="text-sm font-medium flex items-center gap-1 mb-2">
                                                <BookOpen size={16} /> 
                                                <span>Books ({author.books.length})</span>
                                            </h4>
                                            <div className="flex flex-wrap gap-1">
                                                {author.books.slice(0, 3).map(book => (
                                                    <span 
                                                        key={book.id} 
                                                        className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg text-xs"
                                                    >
                                                        {book.title}
                                                    </span>
                                                ))}
                                                {author.books.length > 3 && (
                                                    <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg text-xs">
                                                        +{author.books.length - 3} more
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => openEditAuthorForm(author)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                                            >
                                                <Pencil size={18} />
                                            </button>
                                            <button 
                                                onClick={() => deleteAuthor(author)}
                                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Author Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">
                                    {currentAuthor ? `Edit ${currentAuthor.name}` : 'Add New Author'}
                                </h2>
                                <button 
                                    onClick={closeForm}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-1">Name:</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2"
                                        required
                                    />
                                    {errors.name && (
                                        <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                                    )}
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-1">Biography:</label>
                                    <textarea
                                        name="bio"
                                        value={formData.bio}
                                        onChange={handleInputChange}
                                        rows="4"
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2"
                                        required
                                    ></textarea>
                                    {errors.bio && (
                                        <p className="text-red-500 text-sm mt-1">{errors.bio}</p>
                                    )}
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-1">Image:</label>
                                    <input
                                        type="file"
                                        name="image"
                                        onChange={handleImageChange}
                                        accept="image/*"
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2"
                                    />
                                    {errors.image && (
                                        <p className="text-red-500 text-sm mt-1">{errors.image}</p>
                                    )}
                                    
                                    {currentAuthor && currentAuthor.image && !formData.remove_image && (
                                        <div className="mt-2 flex items-center gap-2">
                                            <img 
                                                src={`/storage/${currentAuthor.image}`} 
                                                alt="Current image" 
                                                className="h-16 w-16 object-cover rounded"
                                            />
                                            <button 
                                                type="button"
                                                onClick={handleRemoveImage}
                                                className="text-red-500 text-sm hover:underline"
                                            >
                                                Remove image
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="mb-6">
                                    <label className="block text-sm font-medium mb-2">Associated Books:</label>
                                    <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2">
                                        {availableBooks.length === 0 ? (
                                            <p className="text-gray-500 text-sm">No books available</p>
                                        ) : (
                                            availableBooks.map(book => (
                                                <div key={book.id} className="flex items-center mb-1">
                                                    <input 
                                                        type="checkbox" 
                                                        id={`book-${book.id}`}
                                                        checked={formData.books.includes(book.id)}
                                                        onChange={() => handleBookToggle(book.id)}
                                                        className="mr-2"
                                                    />
                                                    <label htmlFor={`book-${book.id}`}>{book.title}</label>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={closeForm}
                                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                                    >
                                        {currentAuthor ? 'Update Author' : 'Add Author'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}