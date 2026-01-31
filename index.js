// CT-ChatLibrary - index.js
(function () {
    const EXTENSION_NAME = "CT-ChatLibrary";
    
    // UI References
    const IDs = {
        CHAR_BLOCK: 'rm_characters_block',
        TAG_FILTER: 'rm_tag_filter',
        CHAR_LIST: 'rm_print_characters_block',
        CHAR_PAGINATION: 'rm_print_characters_pagination',
        CONTAINER: 'ct_chats_container',
        LIST: 'ct_chats_list',
        PAGINATION: 'ct_chats_pagination', // New pagination container
        TOGGLE_BTN: 'ct_toggle_view_btn',
        SEARCH: 'ct_chats_search',
        REFRESH: 'ct_chats_refresh'
    };

    // State
    let isChatView = false;
    let cachedChats = [];
    let observer = null;
    let resizeTimeout = null;
    
    const getContext = () => window.SillyTavern.getContext();

    const toggleView = async (e) => {
        e?.stopPropagation();
        isChatView = !isChatView;
        
        const $toggleBtn = $(`#${IDs.TOGGLE_BTN}`);
        const $charList = $(`#${IDs.CHAR_LIST}`);
        const $charPagination = $(`#${IDs.CHAR_PAGINATION}`);
        const $chatContainer = $(`#${IDs.CONTAINER}`);

        if (isChatView) {
            $toggleBtn.addClass('ct_active').attr('title', 'Switch to Character View');
            $charList.addClass('ct_hidden');
            $charPagination.addClass('ct_hidden');
            $chatContainer.removeClass('ct_hidden');
            await loadChats();
        } else {
            $toggleBtn.removeClass('ct_active').attr('title', 'Switch to Chat View');
            $charList.removeClass('ct_hidden');
            $charPagination.removeClass('ct_hidden');
            $chatContainer.addClass('ct_hidden');
        }
    };

    const fetchChatsForCharacter = async (avatarUrl) => {
        try {
            const response = await fetch('/api/characters/chats', {
                method: 'POST',
                headers: getContext().getRequestHeaders(),
                body: JSON.stringify({ avatar_url: avatarUrl, metadata: true })
            });
            if (response.ok) return Object.values(await response.json());
        } catch (e) {
            console.error(`${EXTENSION_NAME}: Error fetching chats for ${avatarUrl}`, e);
        }
        return [];
    };

    const loadChats = async () => {
        const $list = $(`#${IDs.LIST}`);
        const $pagination = $(`#${IDs.PAGINATION}`);
        
        // Show loading state
        $list.html('<div class="ct_loader"><i class="fa-solid fa-spinner fa-spin"></i> Loading chats...</div>');
        $pagination.empty(); // Clear old pagination

        const characters = getContext().characters;
        let allChats = [];
        
        // Batch fetch
        const batchSize = 10;
        for (let i = 0; i < characters.length; i += batchSize) {
            const batch = characters.slice(i, i + batchSize);
            const promises = batch.map(async (char) => {
                const chats = await fetchChatsForCharacter(char.avatar);
                return chats.map(chat => ({
                    ...chat,
                    character_name: char.name,
                    character_avatar: char.avatar,
                    date_obj: new Date(chat.last_mes || 0)
                }));
            });
            const results = await Promise.all(promises);
            results.forEach(r => allChats = allChats.concat(r));
        }

        allChats.sort((a, b) => b.date_obj - a.date_obj);
        cachedChats = allChats;
        
        // Initialize Pagination instead of direct render
        initializePagination(allChats);
    };

    const initializePagination = (chats) => {
        const $container = $(`#${IDs.PAGINATION}`);
        const $list = $(`#${IDs.LIST}`);
        
        if (chats.length === 0) {
            $list.html('<div class="ct_loader">No chats found.</div>');
            return;
        }

        // Calculate optimal page size based on viewport (consistently two columns)
        const getPageSize = () => {
            const viewportWidth = window.innerWidth;
            if (viewportWidth < 768) return 20;      // Mobile: single column
            return 40;                               // Desktop: two columns
        };

        // Use the global jQuery pagination plugin included in SillyTavern
        $container.pagination({
            dataSource: chats,
            pageSize: getPageSize(),
            showPageNumbers: false,
            showNavigator: true,
            prevText: '<',
            nextText: '>',
            position: 'top',
            callback: function (data, pagination) {
                renderChats(data);
            }
        });
    };

    const renderChats = (chats) => {
        const $list = $(`#${IDs.LIST}`);
        $list.empty();

        const frag = document.createDocumentFragment();

        chats.forEach(chat => {
            const card = document.createElement('div');
            card.className = 'ct_chat_card';
            
            const dateStr = chat.date_obj.toLocaleString(undefined, { 
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
            });
            const count = chat.chat_items ?? chat.mes_count ?? '?';
            const displayName = (chat.file_name || 'Untitled').replace('.jsonl', '');

            card.innerHTML = `
                <img class="ct_chat_avatar" src="/characters/${encodeURIComponent(chat.character_avatar)}" loading="lazy" alt="${chat.character_name}" />
                <div class="ct_chat_details">
                    <div class="ct_chat_filename" title="${displayName}">${displayName}</div>
                    <div class="ct_chat_meta">
                        <span class="ct_chat_char_name" title="${chat.character_name}">
                            <i class="fa-solid fa-user"></i> ${chat.character_name.length > 15 ? chat.character_name.substring(0, 15) + '...' : chat.character_name}
                        </span>
                    </div>
                    <div class="ct_chat_meta">
                        <span title="Last modified"><i class="fa-regular fa-clock"></i> ${dateStr}</span>
                        <span title="Message count"><i class="fa-regular fa-comments"></i> ${count}</span>
                    </div>
                </div>
            `;

            card.addEventListener('click', () => openChat(chat));
            frag.appendChild(card);
        });

        $list.append(frag);
    };

    const openChat = async (chatObj) => {
        const context = getContext();
        const targetCharId = context.characters.findIndex(c => c.avatar === chatObj.character_avatar);
        
        if (targetCharId === -1) {
            toastr.error('Character not found in library (deleted?).');
            return;
        }

        const chatName = chatObj.file_name.replace('.jsonl', '');

        // First, check if we need to switch characters
        if (context.characterId !== targetCharId) {
            await context.selectCharacterById(targetCharId);
            
            // Wait for character to be fully loaded
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Now open the specific chat using SillyTavern's API
        try {
            // Try using the openCharacterChat function from SillyTavern's global context
            const { openCharacterChat } = SillyTavern.getContext();
            
            if (typeof openCharacterChat === 'function') {
                // This is the correct way to open a chat in SillyTavern
                await openCharacterChat(chatName);
            } else {
                // Fallback: Try the select element method
                const selectElement = document.getElementById('select_chat_pole');
                if (selectElement) {
                    selectElement.value = chatName;
                    selectElement.dispatchEvent(new Event('change', { bubbles: true }));
                } else {
                    // Last resort: Try the jQuery approach
                    $('#select_chat_pole').val(chatName).trigger('change');
                }
            }
        } catch (error) {
            console.error(`${EXTENSION_NAME}: Error opening chat`, error);
            toastr.error('Failed to open chat. Please try again.');
        }
    };

    const filterList = () => {
        const query = $(`#${IDs.SEARCH}`).val().toLowerCase();
        
        if (!query) {
            initializePagination(cachedChats);
            return;
        }

        const filtered = cachedChats.filter(chat => {
            return (
                (chat.file_name && chat.file_name.toLowerCase().includes(query)) ||
                (chat.character_name && chat.character_name.toLowerCase().includes(query))
            );
        });

        initializePagination(filtered);
    };

    const injectToggleButton = () => {
        if (document.getElementById(IDs.TOGGLE_BTN)) return;
        const $filterContainer = $(`#${IDs.CHAR_BLOCK} .${IDs.TAG_FILTER}`);
        
        if ($filterContainer.length) {
            const toggleBtnHtml = `
                <span id="${IDs.TOGGLE_BTN}" class="tag actionable clickable-action interactable ${isChatView ? 'ct_active' : ''}" title="Switch to Chat View" tabindex="0" role="button">
                    <span class="tag_name fa-solid fa-comments"></span>
                </span>
            `;
            $filterContainer.append(toggleBtnHtml);
            $(`#${IDs.TOGGLE_BTN}`).on('click', toggleView);
        }
    };

    const init = () => {
        const $charBlock = $(`#${IDs.CHAR_BLOCK}`);
        if ($charBlock.length === 0) return;

        // Inject Chat UI Container with Pagination DIV
        if (!document.getElementById(IDs.CONTAINER)) {
            const containerHtml = `
                <div id="${IDs.CONTAINER}" class="ct_hidden">
                    <div id="ct_chats_toolbar">
                        <input id="${IDs.SEARCH}" class="text_pole textarea_compact" type="text" placeholder="Search chats..." autocomplete="off">
                        <div id="${IDs.REFRESH}" class="menu_button fa-solid fa-sync" title="Refresh List"></div>
                    </div>
                    <div id="${IDs.PAGINATION}" class="paginationjs-small"></div>
                    <div id="${IDs.LIST}"></div>
                </div>
            `;
            $charBlock.append(containerHtml);
            
            $(`#${IDs.SEARCH}`).on('input', filterList);
            $(`#${IDs.REFRESH}`).on('click', loadChats);
        }

        injectToggleButton();

        const filterContainer = document.querySelector(`#${IDs.CHAR_BLOCK} .${IDs.TAG_FILTER}`);
        if (filterContainer) {
            observer = new MutationObserver(() => {
                if (!document.getElementById(IDs.TOGGLE_BTN)) {
                    injectToggleButton();
                }
            });
            observer.observe(filterContainer, { childList: true });
        }

        // Add resize handler to update pagination on viewport changes
        $(window).on('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (isChatView && cachedChats.length > 0) {
                    initializePagination(cachedChats);
                }
            }, 250);
        });
    };

    const eventSource = window.SillyTavern?.getContext()?.eventSource;
    if (eventSource) {
        eventSource.on(window.SillyTavern.getContext().event_types.APP_READY, init);
    } else {
        $(document).ready(init);
    }
})();