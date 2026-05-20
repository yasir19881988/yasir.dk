const allergensList = ["Gluten", "Skaldyr", "Æg", "Fisk", "Jordnødder", "Soya", "Mælk", "Nødder", "Selleri", "Sennep", "Sesam", "Svovldioxid", "Lupin", "Bløddyr"];
let imgData = "";

window.onload = () => {
    buildAllergenButtons();
    updatePreview();
};

function buildAllergenButtons() {
    const incCont = document.getElementById('btns-inc');
    const sporCont = document.getElementById('btns-spor');
    if(!incCont || !sporCont) return;

    allergensList.forEach(a => {
        let b1 = document.createElement('button');
        b1.innerText = a; b1.className = 'alg-btn'; b1.type = "button";
        b1.onclick = () => toggleAllergen(a, 'alg_inc', b1, 'active-inc');
        incCont.appendChild(b1);

        let b2 = document.createElement('button');
        b2.innerText = a; b2.className = 'alg-btn'; b2.type = "button";
        b2.onclick = () => toggleAllergen(a, 'alg_spor', b2, 'active-spor');
        sporCont.appendChild(b2);
    });
}

function toggleAllergen(name, inputId, btn, activeClass) {
    const input = document.getElementById(inputId);
    let current = input.value.split(',').map(s => s.trim()).filter(s => s);
    if (current.includes(name)) {
        current = current.filter(i => i !== name);
        btn.classList.remove(activeClass);
    } else {
        current.push(name);
        btn.classList.add(activeClass);
    }
    input.value = current.join(', ');
    updatePreview();
}

function handleImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imgData = e.target.result;
            if(document.getElementById('preview-img')) document.getElementById('preview-img').src = imgData;
            document.getElementById('preview-img-container')?.classList.remove('hidden');
            updatePreview();
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function updatePreview() {
    const data = {
        // 1-2. Basis & Betegnelse
        name: document.getElementById('name')?.value || "",
        brand: document.getElementById('brand')?.value || "",
        legal_name: document.getElementById('legal_name')?.value || "",
        ean: document.getElementById('ean')?.value || "",
        image: imgData,
        
        // 3. Ingredienser & 4. Allergener
        ingredients: document.getElementById('ingredients_rte')?.innerHTML || "",
        allergens: {
            inc: document.getElementById('alg_inc')?.value || "",
            spor: document.getElementById('alg_spor')?.value || ""
        },
        
        // 5. Næring
        nutrition: {
            kj: document.getElementById('kj')?.value || "",
            kcal: document.getElementById('kcal')?.value || "",
            fat: document.getElementById('fat')?.value || "",
            sat: document.getElementById('sat')?.value || "",
            carb: document.getElementById('carb')?.value || "",
            sugar: document.getElementById('sugar')?.value || "",
            fiber: document.getElementById('fiber')?.value || "0",
            protein: document.getElementById('protein')?.value || "",
            salt: document.getElementById('salt')?.value || "",
            portion: document.getElementById('portion')?.value || ""
        },
        
        // 6-7. Logistik & Specs
        specs: {
            netto: document.getElementById('netto')?.value || "",
            gross: document.getElementById('gross_weight')?.value || "",
            kolli: document.getElementById('units_per_colli')?.value || "",
            origin: document.getElementById('origin')?.value || "",
            storage: document.getElementById('storage')?.value || "",
            usage: document.getElementById('usage')?.value || "",
            deposit: document.getElementById('deposit')?.value || ""
        },
        
        // 8. Emballage & Sortering (Fuld dækning)
        env: {
            papir: document.getElementById('env_papir')?.value || "",
            plast: document.getElementById('env_plast')?.value || "",
            metal: document.getElementById('env_metal')?.value || "",
            karton: document.getElementById('env_karton')?.value || "",
            glas: document.getElementById('env_glas')?.value || ""
        },
        
        // 9-10. Firma & Datoer
        biz: {
            name: document.getElementById('biz_name')?.value || "",
            addr: document.getElementById('biz_addr')?.value || ""
        },
        dates: {
            best: document.getElementById('best_before')?.value || "",
            last: document.getElementById('last_date')?.value || "",
            opened: document.getElementById('opened')?.value || "",
            batch: document.getElementById('batch')?.value || ""
        },
        
        // 11-12. Mærker & Advarsler
        adv: {
            aspartam: document.getElementById('a_aspartam')?.checked || false,
            polyol: document.getElementById('a_polyol')?.checked || false,
            azo: document.getElementById('a_azo')?.checked || false,
            lakrids: document.getElementById('a_lakrids')?.checked || false
        },
        marks: [
            document.getElementById('m_dk_oko')?.checked ? 'dk_oko' : null,
            document.getElementById('m_keyhole')?.checked ? 'keyhole' : null,
            document.getElementById('m_halal')?.checked ? 'halal' : null,
            document.getElementById('m_vegan')?.checked ? 'vegan' : null
        ].filter(Boolean)
    };

    // QUID Advarsel
    const quidWarn = document.getElementById('quid-warning');
    if (quidWarn) {
        const needsQuid = (data.name.toLowerCase().includes("jordbær") || data.name.toLowerCase().includes("æble"));
        if (needsQuid && !data.ingredients.includes("%")) quidWarn.classList.remove('hidden');
        else quidWarn.classList.add('hidden');
    }

    localStorage.setItem('preview_product', JSON.stringify(data));
    const frame = document.getElementById('preview-frame');
    if (frame) frame.contentWindow.location.reload();
}

function exportData() {
    const data = localStorage.getItem('preview_product');
    const blob = new Blob([data], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `label-${Date.now()}.json`;
    a.click();
}