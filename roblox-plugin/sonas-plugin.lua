-- ============================================================================
-- Sonas Roblox Studio Plugin
-- ============================================================================
-- Allows Sonas AI agent to directly interact with your Roblox game
-- in development through HTTP polling and script execution.
-- ============================================================================

local HttpService = game:GetService("HttpService")
local RunService = game:GetService("RunService")

-- ============================================================================
-- CONFIGURATION
-- ============================================================================

-- Change these to match your Sonas instance
local CONFIG = {
    API_BASE = "http://localhost:3000",    -- For local dev
    -- API_BASE = "https://sonas.vercel.app",  -- For production
    
    POLL_INTERVAL = 1,                      -- Check for requests every 1 second
    HEARTBEAT_INTERVAL = 5,                 -- Send heartbeat every 5 seconds
    TIMEOUT_SECONDS = 30,                   -- Max time to wait for plugin response
    
    -- User ID - Get from Sonas dashboard
    USER_ID = "your-user-id-here",
    
    -- Optional: Set from environment variable
    -- USER_ID = os.getenv("SONAS_USER_ID") or "default-user",
}

-- ============================================================================
-- PLUGIN INITIALIZATION
-- ============================================================================

local plugin = script:FindFirstAncestorWhichIsA("Plugin")
if not plugin then
    error("This script must be installed as a Roblox plugin")
end

local toolbar = plugin:CreateToolbar("Sonas")
local button = toolbar:CreateButton(
    "Sonas Status",
    "Shows connection status to Sonas AI",
    "rbxasset://textures/Cursors/DragLockedCursor.png"
)

-- Studio instance ID (unique per session)
local STUDIO_INSTANCE_ID = game.JobId
local CONNECTION_STATE = {
    connected = false,
    lastHeartbeat = 0,
    gameId = tostring(game.GameId),
}

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Safe HTTP call wrapper
local function httpCall(url, method, body)
    method = method or "GET"
    
    local success, result
    if method == "GET" then
        success, result = pcall(function()
            return HttpService:GetAsync(url)
        end)
    else
        success, result = pcall(function()
            return HttpService:PostAsync(
                url,
                body,
                Enum.HttpContentType.ApplicationJson
            )
        end)
    end
    
    if success then
        return true, result
    else
        return false, tostring(result)
    end
end

-- JSON encode wrapper
local function encodeJSON(data)
    return HttpService:JSONEncode(data)
end

-- JSON decode wrapper
local function decodeJSON(str)
    local success, result = pcall(function()
        return HttpService:JSONDecode(str)
    end)
    return success, result
end

-- Find instance by path (e.g., "Workspace/Map/Spawn")
local function findInstanceByPath(path)
    if not path or path == "" then
        return game:GetService("Workspace")
    end
    
    local parts = string.split(path, "/")
    local current = nil
    
    -- Try as service first
    local success, service = pcall(function()
        return game:GetService(parts[1])
    end)
    
    if success then
        current = service
    else
        current = game:FindFirstChild(parts[1])
    end
    
    if not current then
        return nil
    end
    
    -- Traverse children
    for i = 2, #parts do
        if current then
            current = current:FindFirstChild(parts[i])
        else
            break
        end
    end
    
    return current
end

-- Get full path of an instance
local function getInstancePath(instance)
    local path = {}
    local current = instance
    
    while current and current ~= game do
        table.insert(path, 1, current.Name)
        current = current.Parent
    end
    
    if #path > 0 and (path[1] == "Workspace" or 
                       path[1] == "ServerScriptService" or 
                       path[1] == "ReplicatedStorage" or
                       path[1] == "StarterPlayer") then
        return table.concat(path, "/")
    end
    
    return nil
end

-- ============================================================================
-- ROBLOX ACTIONS
-- ============================================================================

-- Read a script's source code
local function readScript(scriptPath)
    local instance = findInstanceByPath(scriptPath)
    
    if not instance then
        return nil, "Script not found: " .. scriptPath
    end
    
    if not instance:IsA("LuaSourceContainer") then
        return nil, "Instance is not a script: " .. scriptPath
    end
    
    return instance.Source
end

-- Write/create a script
local function writeScript(scriptPath, code)
    local parts = string.split(scriptPath, "/")
    local scriptName = table.remove(parts)
    local parentPath = table.concat(parts, "/")
    
    local parent = findInstanceByPath(parentPath)
    if not parent then
        return nil, "Parent not found: " .. parentPath
    end
    
    -- Find or create script
    local script = parent:FindFirstChild(scriptName)
    if not script then
        script = Instance.new("LocalScript")
        script.Name = scriptName
        script.Parent = parent
    end
    
    if script:IsA("LuaSourceContainer") then
        script.Source = code
        return { path = getInstancePath(script) }
    else
        return nil, "Instance exists but is not a script"
    end
end

-- Edit specific lines of a script
local function editScript(scriptPath, lineStart, lineEnd, code)
    local instance = findInstanceByPath(scriptPath)
    if not instance or not instance:IsA("LuaSourceContainer") then
        return nil, "Script not found: " .. scriptPath
    end
    
    local source = instance.Source
    local lines = string.split(source, "\n")
    
    -- Replace lines
    for i = lineStart, lineEnd do
        if i <= #lines then
            lines[i] = ""
        end
    end
    
    -- Insert new code
    table.insert(lines, lineStart, code)
    
    instance.Source = table.concat(lines, "\n")
    return { success = true }
end

-- Search for text in scripts
local function grepScripts(pattern, regex, caseSensitive)
    local results = {}
    
    local function searchInScripts(parent)
        for _, child in ipairs(parent:GetChildren()) do
            if child:IsA("LuaSourceContainer") then
                local source = child.Source
                local path = getInstancePath(child)
                
                if path then
                    local found = false
                    if regex then
                        -- Simple regex support (would need better impl)
                        found = source:find(pattern)
                    else
                        if caseSensitive then
                            found = source:find(pattern, 1, true)
                        else
                            found = source:lower():find(pattern:lower(), 1, true)
                        end
                    end
                    
                    if found then
                        table.insert(results, {
                            path = path,
                            matches = { found }
                        })
                    end
                end
            end
            
            searchInScripts(child)
        end
    end
    
    searchInScripts(game)
    return results
end

-- Create an instance
local function createInstance(className, parentPath, instanceName)
    local parent = findInstanceByPath(parentPath)
    if not parent then
        return nil, "Parent not found: " .. parentPath
    end
    
    local instance = Instance.new(className)
    instance.Name = instanceName or className
    instance.Parent = parent
    
    return { path = getInstancePath(instance) }
end

-- Delete an instance
local function deleteInstance(instancePath)
    local instance = findInstanceByPath(instancePath)
    if not instance then
        return nil, "Instance not found: " .. instancePath
    end
    
    instance:Destroy()
    return { success = true }
end

-- Get instance properties
local function getInstance(instancePath)
    local instance = findInstanceByPath(instancePath)
    if not instance then
        return nil, "Instance not found: " .. instancePath
    end
    
    return {
        ClassName = instance.ClassName,
        Name = instance.Name,
        Properties = {
            -- Only expose safe properties
            Transparency = instance:FindFirstChild("Transparency"),
            Color = instance:FindFirstChild("Color"),
            Position = instance:FindFirstChild("Position"),
        }
    }
end

-- Set instance property
local function setInstanceProperty(instancePath, propertyName, value)
    local instance = findInstanceByPath(instancePath)
    if not instance then
        return nil, "Instance not found: " .. instancePath
    end
    
    local success, err = pcall(function()
        instance[propertyName] = value
    end)
    
    if success then
        return { success = true }
    else
        return nil, tostring(err)
    end
end

-- Get instance property
local function getInstanceProperty(instancePath, propertyName)
    local instance = findInstanceByPath(instancePath)
    if not instance then
        return nil, "Instance not found: " .. instancePath
    end
    
    local success, result = pcall(function()
        return instance[propertyName]
    end)
    
    if success then
        return result
    else
        return nil, tostring(result)
    end
end

-- List instance children
local function listInstanceChildren(instancePath)
    local instance = findInstanceByPath(instancePath) or game:GetService("Workspace")
    if not instance then
        return nil, "Instance not found: " .. instancePath
    end
    
    local children = {}
    for _, child in ipairs(instance:GetChildren()) do
        table.insert(children, {
            ClassName = child.ClassName,
            Name = child.Name,
            Path = getInstancePath(child),
        })
    end
    
    return children
end

-- Search for instances by name
local function searchInstances(query, recursive, classFilter)
    local results = {}
    
    local function search(parent)
        for _, child in ipairs(parent:GetChildren()) do
            if child.Name:find(query, 1, true) then
                if not classFilter or child.ClassName == classFilter then
                    table.insert(results, {
                        path = getInstancePath(child),
                        name = child.Name,
                        className = child.ClassName,
                    })
                end
            end
            
            if recursive ~= false then
                search(child)
            end
        end
    end
    
    search(game:GetService("Workspace"))
    return results
end

-- ============================================================================
-- REQUEST PROCESSING
-- ============================================================================

local function processRequest(request)
    local action = request.action
    local payload = request.payload or {}
    
    local success, result, errorMsg
    
    -- Route to appropriate action
    if action == "readScript" then
        result, errorMsg = readScript(payload.path)
    elseif action == "writeScript" then
        result, errorMsg = writeScript(payload.path, payload.code)
    elseif action == "editScript" then
        result, errorMsg = editScript(payload.path, payload.lineStart, payload.lineEnd, payload.code)
    elseif action == "grepScripts" then
        result, errorMsg = grepScripts(payload.pattern, payload.regex, payload.caseSensitive)
    elseif action == "createInstance" then
        result, errorMsg = createInstance(payload.className, payload.parentPath, payload.name)
    elseif action == "deleteInstance" then
        result, errorMsg = deleteInstance(payload.path)
    elseif action == "getInstance" then
        result, errorMsg = getInstance(payload.path)
    elseif action == "setInstanceProperty" then
        result, errorMsg = setInstanceProperty(payload.path, payload.property, payload.value)
    elseif action == "getInstanceProperty" then
        result, errorMsg = getInstanceProperty(payload.path, payload.property)
    elseif action == "listChildren" then
        result, errorMsg = listInstanceChildren(payload.path)
    elseif action == "searchInstances" then
        result, errorMsg = searchInstances(payload.query, payload.recursive, payload.classFilter)
    else
        errorMsg = "Unknown action: " .. action
    end
    
    -- Submit result back to server
    local submitUrl = CONFIG.API_BASE .. "/api/internal/roblox/poll"
    local submitBody = encodeJSON({
        action = "complete",
        userId = CONFIG.USER_ID,
        studioInstanceId = STUDIO_INSTANCE_ID,
        requestId = request.id,
        result = {
            data = result,
            error = errorMsg,
        },
    })
    
    httpCall(submitUrl, "POST", submitBody)
end

-- ============================================================================
-- HEARTBEAT & POLLING
-- ============================================================================

local lastHeartbeat = 0

local function sendHeartbeat()
    local url = CONFIG.API_BASE .. "/api/internal/roblox/poll"
    local body = encodeJSON({
        action = "heartbeat",
        userId = CONFIG.USER_ID,
        studioInstanceId = STUDIO_INSTANCE_ID,
        gameId = CONNECTION_STATE.gameId,
        pluginVersion = "1.0.0",
    })
    
    local success, response = httpCall(url, "POST", body)
    CONNECTION_STATE.connected = success
    CONNECTION_STATE.lastHeartbeat = tick()
end

local function pollRequests()
    if not CONNECTION_STATE.connected then
        return
    end
    
    local url = CONFIG.API_BASE .. "/api/internal/roblox/poll?userId=" ..
                CONFIG.USER_ID .. "&studioInstanceId=" .. STUDIO_INSTANCE_ID
    
    local success, response = httpCall(url, "GET")
    
    if not success then
        CONNECTION_STATE.connected = false
        return
    end
    
    local ok, data = decodeJSON(response)
    if not ok then
        return
    end
    
    -- Process each pending request
    for _, request in ipairs(data.requests or {}) do
        processRequest(request)
    end
end

-- ============================================================================
-- MAIN LOOP
-- ============================================================================

RunService.Heartbeat:Connect(function()
    local now = tick()
    
    -- Send heartbeat every N seconds
    if now - lastHeartbeat > CONFIG.HEARTBEAT_INTERVAL then
        sendHeartbeat()
        lastHeartbeat = now
    end
    
    -- Poll for requests
    pollRequests()
end)

-- ============================================================================
-- UI
-- ============================================================================

button.Click:Connect(function()
    if CONFIG.USER_ID == "your-user-id-here" then
        print("ERROR: Set CONFIG.USER_ID to your Sonas user ID")
    elseif CONNECTION_STATE.connected then
        print("✓ Sonas Connected")
        print("  Ready to execute AI agent commands")
    else
        print("✗ Sonas Disconnected")
        print("  Check: API_BASE URL, USER_ID, and network connection")
    end
end)

-- Initial heartbeat
sendHeartbeat()

print("Sonas plugin loaded. Configure USER_ID and API_BASE to connect.")
