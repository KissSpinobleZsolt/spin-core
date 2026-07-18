from app.routes.chat.constants import _NAV_PUBLIC, _NAV_ADMIN


def _build_system_message(pg, bot, user_roles: list[str], module: dict | None = None) -> str:
    """Compose the full system prompt for a bot.

    Concatenates (in order): the bot-type preprompt, a platform-context block
    describing available pages / modules / bots, and the bot's own system prompt.
    Empty sections are omitted so the final string has no stray blank lines.

    Args:
        pg: Active `PostgresAdapter` instance used to query modules and bots.
        bot: `BotRecord` whose type preprompt and system prompt are used.
        user_roles: Roles of the requesting user; determines which nav links
            and bots are surfaced in the context block.
        module: Optional module dict injected when the chat originates from a
            specific micro-frontend module.

    Returns:
        A single string suitable for use as the ``system`` role message.
    """
    is_admin = "admin" in user_roles  # determines whether admin-only nav links are included

    # Look up the preprompt text defined on the bot's type.
    preprompt = ""  # default to empty if the bot type has no preprompt or doesn't exist
    for bt in pg.get_bot_types():
        if bt["name"] == bot.type:
            preprompt = bt.get("preprompt") or ""  # guard against None in the DB
            break

    modules = pg.get_modules(enabled_only=True, user_roles=user_roles)  # only enabled modules visible to this user
    bots = pg.get_bots(admin=False, user_roles=user_roles)              # active bots visible to this user

    nav = _NAV_PUBLIC + (_NAV_ADMIN if is_admin else [])  # build the navigation list based on the caller's role

    # Optional current-module context block appended when the request originates
    # from a specific module page.
    module_lines = []
    if module:  # inject module-specific context when the chat originates from a module page
        module_lines = [
            "",
            "### Current Module",
            f"You are embedded in the '{module['name']}' module: {module['description']}",
            f"Module route: /modules/{module['route']}",
        ]

    ctx_lines = [
        "## PLATFORM CONTEXT (injected) ##",
        "",
        "You are running inside spin-core, a full-stack AI platform.",
        "",
        "### Pages",
        *[f"- [{name}]({route}): {desc}" for route, name, desc in nav],  # unpack nav tuples into Markdown links
        "",
        "### Installed Modules",
        *(
            [f"- {m['icon']} [{m['name']}](/modules/{m['route']}): {m['description']}" for m in modules]
            if modules else ["- (none installed)"]
        ),
        "",
        "### Available Bots",
        *(
            [f"- {b.icon} {b.name} [{b.type}]: {b.description}" for b in bots]
            if bots else ["- (none available)"]
        ),
        *module_lines,  # append module block when present; empty list means nothing is added
        "",
        "## END PLATFORM CONTEXT ##",
    ]

    # Join non-empty sections with a blank line between them.
    parts = [p for p in [preprompt, "\n".join(ctx_lines), bot.system_prompt] if p]  # filter out empty strings
    return "\n\n".join(parts)  # double newline separates sections for clean LLM readability
