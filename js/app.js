document.addEventListener('DOMContentLoaded', () => {
    
    // Page Context
    const currentPage = document.body.getAttribute('data-page');

    // UI Elements
    const addBtn = document.getElementById('addBtn');
    const formModal = document.getElementById('formModal');
    const closeModal = document.getElementById('closeModal');
    const cancelModal = document.getElementById('cancelModal');
    const recordForm = document.getElementById('recordForm');
    const dataBody = document.getElementById('dataBody');
    const logoutBtn = document.getElementById('logoutBtn');

    let currentActionType = 'create';
    let currentRecordId = null;

    verifyAuth();

    async function verifyAuth() {
        // Login bypassed as requested
        routeLogic();
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    function routeLogic() {
        if (currentPage === 'dashboard') {
            loadDashboardMetrics();
        } else if (['plants', 'staff', 'visitors'].includes(currentPage)) {
            loadTableData();
            setupModal();
            if (currentPage === 'visitors') setupMarketplace();
        }
    }

    async function loadDashboardMetrics() {
        const metrics = ['plants', 'staff', 'visitors'];
        for (let m of metrics) {
            try {
                const res = await fetch(`/api/${m}`);
                const data = await res.json();
                const el = document.getElementById(`total${m.charAt(0).toUpperCase() + m.slice(1)}`);
                if(el && !data.error) {
                    el.textContent = data.length || 0;
                }
            } catch(e) {
                console.error("Failed to load metric for", m);
            }
        }
        
        try {
            const res = await fetch('/api/dashboard/revenue');
            const data = await res.json();
            const revEl = document.getElementById('totalRevenue');
            if (revEl && !data.error) {
                revEl.textContent = '₹' + parseFloat(data.totalRevenue || 0).toFixed(2);
            }
        } catch(e) {
            console.error("Failed to load revenue");
        }
    }

    async function loadTableData() {
        try {
            const res = await fetch(`/api/${currentPage}`);
            if (res.status === 401) window.location.href = 'index.html';
            const data = await res.json();
            
            if (data.error) {
                dataBody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:red;">Ensure database.sql is imported.</td></tr>`;
                return;
            }

            renderTable(data);
        } catch (e) {
            dataBody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:red;">Error connecting to API.</td></tr>`;
        }
    }

    function renderTable(data) {
        if (data.length === 0) {
            dataBody.innerHTML = `<tr><td colspan="10" style="text-align:center">No records found.</td></tr>`;
            return;
        }

        const pkMap = { plants: 'plant_id', staff: 'staff_id', visitors: 'visitor_id' };
        const pk = pkMap[currentPage];

        let html = '';
        data.forEach(row => {
            html += '<tr>';
            if (currentPage === 'plants') {
                if (row.image) {
                     html += `<td><div class="img-zoom-container"><img src="uploads/${row.image}" class="plant-thumb" alt="Plant"></div></td>`;
                } else {
                     html += `<td><span class="no-img">No Image</span></td>`;
                }
                html += `<td>${row.plant_id}</td>`;
                html += `<td>${row.name}</td>`;
                html += `<td>${row.scientific_name}</td>`;
                html += `<td>${row.category}</td>`;
                html += `<td>${row.quantity}</td>`;
                html += `<td>₹${parseFloat(row.price || 0).toFixed(2)}</td>`;
                html += `<td>${row.location}</td>`;
                html += `<td>${row.date_added}</td>`;
            } else {
                Object.values(row).forEach(val => {
                    html += `<td>${val}</td>`;
                });
            }
            
            // Store stringified row data for easy edit parsing
            const rowDataStr = JSON.stringify(row).replace(/'/g, "&apos;");
            html += `<td>
                <button class="action-btn edit-btn" style="color:#3498db; margin-right: 10px;" data-row='${rowDataStr}'>Edit</button>
                <button class="action-btn delete-btn" data-id="${row[pk]}">Delete</button>
            </td>`;
            html += '</tr>';
        });
        dataBody.innerHTML = html;

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (confirm('Are you sure you want to delete this record?')) {
                    const id = e.target.getAttribute('data-id');
                    await deleteRecord(id);
                }
            });
        });
        
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const rowData = JSON.parse(e.target.getAttribute('data-row'));
                openEditModal(rowData);
            });
        });
    }

    async function deleteRecord(id) {
        try {
            const res = await fetch(`/api/${currentPage}`, {
                method: 'DELETE',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({id})
            });
            const result = await res.json();
            if (result.success) loadTableData();
            else alert(result.error || 'Failed to delete');
        } catch(e) {
            alert('Error processing request.');
        }
    }

    function openEditModal(rowData) {
        if(!formModal) return;
        
        // Populate inputs
        for (const [key, value] of Object.entries(rowData)) {
            const input = document.querySelector(`[name="${key}"]`);
            if (input && input.type !== 'file') {
                input.value = value;
            }
        }
        
        currentActionType = 'update';
        
        const pkMap = { plants: 'plant_id', staff: 'staff_id', visitors: 'visitor_id' };
        currentRecordId = rowData[pkMap[currentPage]];
        
        // Handle image preview for edit
        const imagePreview = document.getElementById('imagePreview');
        if (currentPage === 'plants' && imagePreview) {
            if (rowData.image) {
                imagePreview.src = `uploads/${rowData.image}`;
                imagePreview.style.display = 'inline-block';
            } else {
                imagePreview.src = '';
                imagePreview.style.display = 'none';
            }
        }
        
        formModal.classList.add('active');
    }

    function setupModal() {
        if(!addBtn || !formModal) return;

        const imageInput = document.getElementById('imageInput');
        const imagePreview = document.getElementById('imagePreview');

        if (imageInput && imagePreview) {
            imageInput.addEventListener('change', function() {
                const file = this.files[0];
                if (file) {
                    imagePreview.src = URL.createObjectURL(file);
                    imagePreview.style.display = 'inline-block';
                } else {
                    imagePreview.style.display = 'none';
                    imagePreview.src = '';
                }
            });
        }

        addBtn.addEventListener('click', () => {
            currentActionType = 'create';
            currentRecordId = null;
            formModal.classList.add('active');
        });

        const closeFunc = () => { 
            formModal.classList.remove('active'); 
            recordForm.reset(); 
            currentActionType = 'create';
            currentRecordId = null;
            if(imagePreview) {
                imagePreview.style.display = 'none';
                imagePreview.src = '';
            }
        };
        
        closeModal.addEventListener('click', closeFunc);
        cancelModal.addEventListener('click', closeFunc);

        recordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(recordForm);
            
            // Programmatically set editing states
            formData.set('action_type', currentActionType);
            if (currentRecordId) {
                formData.set('id', currentRecordId);
            }

            try {
                const res = await fetch(`/api/${currentPage}`, {
                    method: 'POST',
                    body: formData
                });
                
                const textOutput = await res.text();
                let result;
                try {
                    result = JSON.parse(textOutput);
                } catch(err) {
                    console.error("Non-JSON output:", textOutput);
                    alert("Server error occurred.");
                    return;
                }
                
                if (result.success) {
                    closeFunc();
                    loadTableData();
                } else {
                    alert(result.error || 'Operation failed');
                }
            } catch (err) {
                alert('Server connection error.');
            }
        });
    }

    // Marketplace Logic (Buy Plant from Visitors Page)
    function setupMarketplace() {
        const buyBtn = document.getElementById('buyBtn');
        const buyModal = document.getElementById('buyModal');
        const buyVisitorSelect = document.getElementById('buyVisitorSelect');
        const buyPlantSelect = document.getElementById('buyPlantSelect');
        const plantDetails = document.getElementById('plantDetails');
        const buyForm = document.getElementById('buyForm');
        
        if (!buyBtn || !buyModal) return;

        let availablePlants = [];

        buyBtn.addEventListener('click', async () => {
            // Fetch plants and visitors
            try {
                const [resPlants, resVisitors] = await Promise.all([
                    fetch('/api/plants'),
                    fetch('/api/visitors')
                ]);
                const plants = await resPlants.json();
                const visitors = await resVisitors.json();
                
                availablePlants = plants.filter(p => p.quantity > 0);
                
                // Populate dropdowns
                buyVisitorSelect.innerHTML = '<option value="">-- Choose a Visitor --</option>';
                visitors.forEach(v => {
                    buyVisitorSelect.innerHTML += `<option value="${v.visitor_id}">${v.name}</option>`;
                });

                buyPlantSelect.innerHTML = '<option value="">-- Choose a Plant --</option>';
                availablePlants.forEach(p => {
                    buyPlantSelect.innerHTML += `<option value="${p.plant_id}">${p.name} (₹${parseFloat(p.price).toFixed(2)})</option>`;
                });
                
                plantDetails.style.display = 'none';
                document.getElementById('confirmBuyBtn').disabled = true;
                buyModal.classList.add('active');
            } catch (err) {
                alert("Failed to load plants");
            }
        });

        buyPlantSelect.addEventListener('change', () => {
            const plantId = buyPlantSelect.value;
            const plant = availablePlants.find(p => p.plant_id == plantId);
            
            if (plant) {
                plantDetails.style.display = 'block';
                document.getElementById('buyAvailableStock').textContent = plant.quantity;
                document.getElementById('buyUnitPrice').textContent = `₹${parseFloat(plant.price).toFixed(2)}`;
                document.getElementById('buyQuantity').max = plant.quantity;
                document.getElementById('buyQuantity').value = 1;
                document.getElementById('confirmBuyBtn').disabled = false;
                updateMarketplaceTotal(plant.price);
            } else {
                plantDetails.style.display = 'none';
                document.getElementById('confirmBuyBtn').disabled = true;
            }
        });

        document.getElementById('buyQuantity').addEventListener('input', () => {
            const plantId = buyPlantSelect.value;
            const plant = availablePlants.find(p => p.plant_id == plantId);
            if (plant) updateMarketplaceTotal(plant.price);
        });

        function updateMarketplaceTotal(price) {
            const qty = document.getElementById('buyQuantity').value;
            const total = (qty * price).toFixed(2);
            document.getElementById('buyTotalPrice').textContent = `₹${total}`;
        }

        const closeBuy = () => {
            buyModal.classList.remove('active');
            buyForm.reset();
        };

        document.getElementById('closeBuyModal').onclick = closeBuy;
        document.getElementById('cancelBuyModal').onclick = closeBuy;

        buyForm.onsubmit = async (e) => {
            e.preventDefault();
            const visitorId = buyVisitorSelect.value;
            const plantId = buyPlantSelect.value;
            const qty = parseInt(document.getElementById('buyQuantity').value);
            
            try {
                const res = await fetch('/api/buy-plant', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ visitor_id: visitorId, plant_id: plantId, quantity: qty })
                });
                const result = await res.json();
                if (result.success) {
                    alert(result.message);
                    closeBuy();
                } else {
                    alert(result.error || "Purchase failed");
                }
            } catch (err) {
                alert("Server error");
            }
        };
    }

    // Remove the old openBuyModal as it's replaced by setupMarketplace
    // (This chunk replaces the entire footer area of the script)
});
