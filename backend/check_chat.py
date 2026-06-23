import django; import os; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from workspace.models_chat import ChatThread, ChatParticipant, ChatMessage
threads = ChatThread.objects.all()
for t in threads:
    participants = ChatParticipant.objects.filter(thread=t)
    msgs = ChatMessage.objects.filter(thread=t)
    p_list = [(p.user_id, p.user.username if p.user else '?') for p in participants if p.user]
    print(f'Thread {t.id}: type={t.thread_type}, title="{t.title}", msgs={msgs.count()}, participants={p_list}')
    for m in msgs.order_by('created_at')[:3]:
        print(f'  Msg {m.id}: sender={m.sender_id}, body="{m.body[:80]}", created={m.created_at}')