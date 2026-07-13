
---

Component InventoryPage
    render:

---

Component NavBar
    render:
        <nav>
            <LinkItem>Producten</LinkItem>
            <LinkItem>Opbergplaatsen</LinkItem>
        </nav>

---

Component SearchBar
    props:
        SearchBarProps
            value
            onChange(value) => void
    render:
        <input />

Component ResultList
    actions:
        getResults(string query): Results
    state:
        results, setResults
    render:
        <>
            <h1>titel</h1>
            For item in results:
                <ResultItem />
        </>

Component ResultItem
    props:
        ResultItemProps
            name
            childrenCount
    render: 
        <article>
            <div>
                <p>{props.name}</p>
                <p>{props.childrenCount}</p>
            </div>
            <span>></span>
        </article>

Component ProductsManagementPage
    state:
        query, setQuery
        searchBarHidden, setSearchBarHidden
    render:
        <>
            <NavBar />
            <SearchBar onSearch={setQuery} isHidden={searchBarHidden} />
            <ResultList query={query} setSearchBarhidden={setSearchBarHidden} />  
        </>

---

Component LocationsManagementPage
    render:
        <>
            <NavBar />
        </>

---

Component BottomTabbar
    props: 
    state: 
        activeTab: TabId
    actions:
        onTabChange(tabId: TabId)
    render:
        <nav>
            <NavLink>Home</NavLink>
            <NavLink>Producten</NavLink>
        </nav>

Component Layout
    render:
        Outlet
        BottomTabBar
        
---