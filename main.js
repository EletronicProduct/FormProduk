import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const { createApp, ref, computed, onMounted } = Vue;

createApp({
  setup() {
    // Your Firebase configuration
    const firebaseConfig = {
      apiKey: "AIzaSyBNDz7VwSE-gQkE1NK-sQpiYdNlB1BI46s",
      authDomain: "product-cicilan.firebaseapp.com",
      projectId: "product-cicilan",
      storageBucket: "product-cicilan.firebasestorage.app",
      messagingSenderId: "180951818261",
      appId: "1:180951818261:web:dbce045586d63ee678ee1c",
      measurementId: "G-D1PK016KK9"
    };
    
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    // App State
    const currentView = ref('table'); // 'table' or 'form'
    const appLoading = ref(true);
    
    // Data for Table View
    const products = ref([]);
    
    // Data for Form View
    const product = ref({});
    const selectedProductId = ref(null);
    const isSaving = ref(false);
    const imageUrlsInput = ref('');
    const message = ref('');
    const messageClass = ref('');
    const showDeleteModal = ref(false);
    
    // Multipliers (Updated with new tenor values)
    const multipliers = ref({
      electronics: {
        60: 1.1,
        90: 1.2,
        120: 1.3,
        150: 1.4,
        180: 1.5
      },
      furniture: {
        60: 1.05,
        90: 1.1,
        120: 1.15,
        150: 1.2,
        180: 1.25
      }
    });
    
    // Computed properties
    const formTitle = computed(() => {
      return selectedProductId.value ? 'Edit Produk' : 'Tambah Produk Baru';
    });
    
    const saveButtonText = computed(() => {
      if (isSaving.value) {
        return selectedProductId.value ? 'Menyimpan...' : 'Menambahkan...';
      }
      return selectedProductId.value ? 'Simpan Perubahan' : 'Tambah Produk';
    });
    
    // Functions for View Switching
    const showTableView = () => {
      currentView.value = 'table';
      selectedProductId.value = null;
      product.value = {};
      fetchProducts(); // Refresh table
    };
    
    const showAddForm = () => {
      currentView.value = 'form';
      selectedProductId.value = null;
      product.value = {
        name: '',
        description: '',
        basePrice: 0,
        downPayment: 0,
        imageUrls: [],
        whatsappNumber: '', // Added WhatsApp Number
        category: '',
        tenorOptions: []
      };
      imageUrlsInput.value = '';
      message.value = 'Mode Tambah: Masukkan detail produk baru.';
      messageClass.value = 'text-blue-600';
    };
    
    const showEditForm = async (id) => {
      currentView.value = 'form';
      selectedProductId.value = id;
      message.value = 'Memuat data produk...';
      messageClass.value = 'text-gray-500';
      
      try {
        const productRef = doc(db, 'products', id);
        const productSnap = await getDoc(productRef);
        
        if (productSnap.exists()) {
          const data = productSnap.data();
          product.value = {
            ...data,
            basePrice: data.basePrice || 0,
            downPayment: data.downPayment || 0,
            tenorOptions: data.tenorOptions || [],
            whatsappNumber: data.whatsappNumber || '' // Load WhatsApp number
          };
          imageUrlsInput.value = (data.imageUrls || []).join(', ');
          if (data.multipliers) {
            multipliers.value = data.multipliers;
          }
          message.value = 'Mode Edit: Data berhasil dimuat.';
          messageClass.value = 'text-green-600';
        } else {
          message.value = 'Error: Produk tidak ditemukan.';
          messageClass.value = 'text-red-600';
          selectedProductId.value = null;
        }
      } catch (error) {
        console.error("Kesalahan saat memuat produk:", error);
        message.value = 'Error: Gagal memuat data produk.';
        messageClass.value = 'text-red-600';
      }
    };
    
    // Functions for Firestore Operations
    const fetchProducts = async () => {
      appLoading.value = true;
      try {
        const productsCollection = collection(db, 'products');
        const productsSnapshot = await getDocs(productsCollection);
        
        products.value = productsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error("Error fetching products:", error);
        alert("Gagal memuat daftar produk. Periksa koneksi internet.");
      } finally {
        appLoading.value = false;
      }
    };
    
    const saveProduct = async () => {
      isSaving.value = true;
      message.value = 'Menyimpan...';
      messageClass.value = 'text-gray-500';
      
      product.value.imageUrls = imageUrlsInput.value.split(',').map(url => url.trim()).filter(url => url);
      product.value.multipliers = multipliers.value;
      
      try {
        let docRef;
        if (selectedProductId.value) {
          // Mode Edit
          docRef = doc(db, 'products', selectedProductId.value);
          await setDoc(docRef, product.value, { merge: true });
          message.value = 'Produk berhasil diperbarui!';
          messageClass.value = 'text-green-600';
        } else {
          // Mode Tambah
          docRef = doc(collection(db, 'products'));
          await setDoc(docRef, product.value);
          selectedProductId.value = docRef.id;
          message.value = 'Produk berhasil ditambahkan!';
          messageClass.value = 'text-green-600';
        }
      } catch (error) {
        console.error("Kesalahan saat menyimpan produk:", error);
        message.value = 'Error: Gagal menyimpan produk. Coba lagi.';
        messageClass.value = 'text-red-600';
      } finally {
        isSaving.value = false;
      }
    };
    
    const deleteProduct = (id, name) => {
      if (confirm(`Anda yakin ingin menghapus produk "${name}"?`)) {
        try {
          deleteDoc(doc(db, 'products', id));
          alert(`Produk "${name}" berhasil dihapus.`);
          fetchProducts(); // Refresh the list
        } catch (error) {
          console.error("Error deleting product:", error);
          alert("Gagal menghapus produk. Coba lagi.");
        }
      }
    };
    
    // Utility function to format currency
    const formatCurrency = (value) => {
      if (typeof value !== 'number') return 'Rp0';
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
      }).format(value);
    };
    
    // Initial data load
    onMounted(() => {
      fetchProducts();
    });
    
    return {
      appLoading,
      currentView,
      products,
      product,
      multipliers,
      selectedProductId,
      isSaving,
      imageUrlsInput,
      message,
      messageClass,
      formTitle,
      saveButtonText,
      showTableView,
      showAddForm,
      showEditForm,
      saveProduct,
      deleteProduct,
      formatCurrency,
    };
  },
}).mount('#app');