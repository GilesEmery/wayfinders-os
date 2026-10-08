-- Give the shared Hub a mission-centered welcome rather than signup instructions.
update public.hubs
set description = 'Wayfinders helps everyday leaders move into the future and make the greatest impact. Together, we clarify our God-given calling, activate our purpose, and multiply good where we live and lead.'
where slug = 'wayfinders-hub-main';
