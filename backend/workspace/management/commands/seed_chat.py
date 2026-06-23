"""Seed script for sample chat threads and messages.

Run: python manage.py seed_chat

Creates realistic 1:1 direct conversations between the admin user
and other active users — useful for testing the Chat page.
"""

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone

from workspace.models_chat import ChatThread, ChatParticipant, ChatMessage, ChatAttachment
from workspace.models_chat import THREAD_TYPE_DIRECT, THREAD_TYPE_GROUP


# ── Sample conversations ──
# Each entry: (other_username, [ (sender_username, body, minutes_ago), ... ])

# ── Sample group threads ──

SAMPLE_GROUPS = [
    (
        "Quality Improvement Team",
        ["supervisor", "manager"],
        [
            ("admin", "Let's review the Q2 quality metrics before the monthly ops review.", 2880),
            ("supervisor", "I've compiled the defect data. Top issue is still the surface scratch on bracket assembly.", 2870),
            ("manager", "What's the current PPM rate compared to target?", 2860),
            ("admin", "Currently at 5,800 PPM against a target of 5,000. The new inspection camera on Line 4 should help close the gap.", 2855),
            ("supervisor", "We've already seen a 15% reduction in escapes since installation last month.", 2850),
            ("manager", "Good progress. Let's target 5,200 PPM for July and 5,000 by September.", 2845),
            ("admin", "Agreed. I'll set up a weekly review for the next 4 weeks to track progress.", 2840),
        ],
    ),
    (
        "Production Planning",
        ["manager", "supervisor"],
        [
            ("admin", "Heads up: Press #103 will be down for hydraulic filter replacement tomorrow morning.", 1440),
            ("supervisor", "How long is the downtime expected? I need to adjust the line schedule.", 1435),
            ("admin", "About 2 hours. Should be back online by 10am.", 1430),
            ("manager", "Can we shift the bracket assembly batch to the afternoon to compensate?", 1425),
            ("admin", "Yes, I've already updated the schedule. Bracket assembly will run 1pm-5pm on Line 3.", 1420),
            ("supervisor", "I'll brief the afternoon shift lead on the change.", 1415),
        ],
    ),
]

SAMPLE_CONVERSATIONS = [
    (
        "supervisor",
        [
            ("supervisor", "Hey, the press brake on Line 3 is making a weird noise. Should we shut it down?", 480),
            ("admin", "Can you describe the noise? Grinding or knocking?", 475),
            ("supervisor", "More of a knocking sound, happens on the downstroke.", 470),
            ("admin", "Shut it down and tag it out. I'll log a maintenance work order right now.", 468),
            ("supervisor", "Done. Tagged and locked out. I'll move the operators to Line 2 for now.", 465),
            ("admin", "Good call. I submitted WO-2024-0891. Maintenance will inspect first thing tomorrow.", 460),
            ("supervisor", "Thanks. What about the production target for today?", 455),
            ("admin", "I'll adjust the schedule. Let's aim for 80% on Line 2 to cover the gap.", 450),
        ],
    ),
    (
        "manager",
        [
            ("manager", "Can you send me the Q2 quality metrics before the 3pm review?", 1440),
            ("admin", "Sure, I'll pull the data from the dashboard now.", 1435),
            ("admin", "Here's a summary: Overall yield improved to 94.2%, top defect is surface scratch on bracket assembly.", 1430),
            ("manager", "94.2% is good. How are we tracking against the 95% target?", 1425),
            ("admin", "Within 0.8% — the new inspection camera on Line 4 caught a lot of early defects. Expecting to hit 95% by end of Q3.", 1420),
            ("manager", "Excellent. Include that projection in the review deck.", 1415),
            ("admin", "Will do. I'll have the deck ready by 2pm.", 1410),
        ],
    ),
    (
        "owner",
        [
            ("owner", "I noticed the overtime budget is running 12% over for this month. Any concerns?", 2880),
            ("admin", "Yes, we had two emergency breakdowns last week that required overtime for the maintenance crew.", 2875),
            ("owner", "Any way to reduce the spend for the rest of the month?", 2870),
            ("admin", "I've scheduled preventive maintenance during regular hours going forward. That should bring us back under budget by month-end.", 2865),
            ("owner", "Good. Let's discuss at the monthly ops review on Friday.", 2860),
            ("admin", "Noted. I'll prepare a breakdown of the overtime spend for that meeting.", 2855),
        ],
    ),
    (
        "guest",
        [
            ("guest", "Hi, I'm visiting from the corporate office next week. Could I get a tour of the plant?", 10080),
            ("admin", "Absolutely! We'd be happy to show you around. What day works best?", 10075),
            ("guest", "Wednesday around 10am if that works for you.", 10070),
            ("admin", "Wednesday at 10am works perfectly. I'll schedule a walkthrough of the main production floor and the new assembly line.", 10065),
            ("guest", "Perfect. Looking forward to it!", 10060),
            ("admin", "See you then. I'll have PPE ready at the front office.", 10055),
        ],
    ),
    (
        "testuser",
        [
            ("testuser", "I'm having trouble accessing the quality dashboard this morning.", 720),
            ("admin", "Are you getting an error message?", 715),
            ("testuser", "Just a blank page when I try to open it.", 710),
            ("admin", "Let me check the server status... looks like there was a deployment last night. Try clearing your cache and refreshing.", 705),
            ("testuser", "That worked! I'm in now. Thanks!", 700),
            ("admin", "Great. Let me know if anything else comes up.", 695),
        ],
    ),
    (
        "newadmin",
        [
            ("newadmin", "Could you walk me through the incident reporting process?", 4320),
            ("admin", "Sure. Any incident or near-miss gets logged in the system. I'll show you the workflow.", 4315),
            ("newadmin", "I have a report from yesterday's shift — a slip in the warehouse aisle.", 4310),
            ("admin", "Perfect, that's a good example. Log in, go to Safety > Incidents, and click 'New Report'. I'll review it once submitted.", 4305),
            ("newadmin", "Done. Can you take a look?", 4300),
            ("admin", "Looks good. I've assigned it to the warehouse supervisor for immediate corrective action. A slip hazard should be addressed within 24 hours.", 4295),
            ("newadmin", "Got it. I'll follow up with them tomorrow.", 4290),
        ],
    ),
]


class Command(BaseCommand):
    help = (
        "Seed sample chat threads and messages between admin and other users. "
        "Creates realistic conversations for testing the Chat page."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear", action="store_true",
            help="Delete all existing ChatMessage, ChatParticipant, and ChatThread records before seeding",
        )
        parser.add_argument(
            "--count", type=int, default=0,
            help="Override number of conversations to create (0 = use all sample data)",
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(self.style.SUCCESS("  CHAT SEED COMMAND"))
        self.stdout.write(self.style.SUCCESS("=" * 60))

        # Find admin user
        try:
            admin = User.objects.get(username="admin")
        except User.DoesNotExist:
            admin = User.objects.filter(is_superuser=True).first()
        if not admin:
            self.stdout.write(self.style.ERROR("  No admin or superuser found. Cannot seed chat."))
            return

        if options["clear"]:
            msg_count = ChatMessage.objects.count()
            part_count = ChatParticipant.objects.count()
            thread_count = ChatThread.objects.count()
            ChatMessage.objects.all().delete()
            ChatParticipant.objects.all().delete()
            ChatThread.objects.all().delete()
            self.stdout.write(f"  Cleared {thread_count} threads, {part_count} participants, {msg_count} messages")

        conversations = SAMPLE_CONVERSATIONS[:options["count"]] if options["count"] > 0 else SAMPLE_CONVERSATIONS
        groups = SAMPLE_GROUPS[:options["count"]] if options["count"] > 0 else SAMPLE_GROUPS

        self.stdout.write(f"\n  Creating {len(conversations)} conversations + {len(groups)} group chats for user '{admin.username}'...\n")

        created_threads = 0
        created_messages = 0
        skipped = 0

        now = timezone.now()

        for other_username, messages in conversations:
            if not User.objects.filter(username=other_username, is_active=True).exists():
                self.stdout.write(self.style.WARNING(f"  ~~ SKIP: User '{other_username}' not found or inactive"))
                skipped += 1
                continue

            sid = transaction.savepoint()
            try:
                other_user = User.objects.get(username=other_username)

                # Create thread
                thread = ChatThread.objects.create(thread_type=THREAD_TYPE_DIRECT)
                ChatParticipant.objects.create(thread=thread, user=admin)
                ChatParticipant.objects.create(thread=thread, user=other_user)

                # Create messages with offset timestamps
                for sender_username, body, minutes_ago in messages:
                    sender = admin if sender_username == "admin" else other_user
                    created_at = now - timedelta(minutes=minutes_ago)

                    # Use create() then update() to bypass auto_now_add on created_at
                    msg = ChatMessage.objects.create(thread=thread, sender=sender, body=body)
                    ChatMessage.objects.filter(id=msg.id).update(created_at=created_at)
                    created_messages += 1

                    # Add sample attachments to some messages
                    if minutes_ago == 468:  # supervisor shutdown message
                        ChatAttachment.objects.create(
                            message=msg,
                            file_url="/media/chat-attachments/work_order_screenshot_e4f2a1b3c0d9.png",
                            file_name="Press_Brake_Line3_Error.png",
                            file_size=245760,
                            mime_type="image/png",
                        )
                    elif minutes_ago == 1430:  # manager metrics message
                        ChatAttachment.objects.create(
                            message=msg,
                            file_url="/media/chat-attachments/q2_metrics_r7k2m9x1p4q6.pdf",
                            file_name="Q2_Quality_Metrics_Summary.pdf",
                            file_size=524288,
                            mime_type="application/pdf",
                        )
                    elif minutes_ago == 705:  # testuser troubleshooting
                        ChatAttachment.objects.create(
                            message=msg,
                            file_url="/media/chat-attachments/server_status_w3b8n5v2c1z7.png",
                            file_name="Dashboard_Error_Screenshot.png",
                            file_size=156672,
                            mime_type="image/png",
                        )
                    elif minutes_ago == 4305:  # newadmin incident report
                        ChatAttachment.objects.create(
                            message=msg,
                            file_url="/media/chat-attachments/incident_form_m6d4h9g2k8t3.pdf",
                            file_name="Warehouse_Incident_Report_Form.pdf",
                            file_size=856064,
                            mime_type="application/pdf",
                        )

                # Update thread last_message_at
                last_msg_created = now - timedelta(minutes=messages[-1][2])
                thread.last_message_at = last_msg_created
                thread.save(update_fields=["last_message_at", "updated_at"])

                # Mark admin's read state slightly behind last message (simulates some unread)
                ChatParticipant.objects.filter(thread=thread, user=admin).update(
                    last_read_at=last_msg_created - timedelta(minutes=5),
                )

                # Mark a couple threads as favorited
                if other_username in ("supervisor", "manager"):
                    ChatParticipant.objects.filter(thread=thread, user=admin).update(is_favorited=True)

                created_threads += 1

                other_display = other_user.get_full_name() or other_user.username
                admin_display = admin.get_full_name() or admin.username
                self.stdout.write(
                    f"  [OK] {admin_display:20s} <-> {other_display:20s} "
                    f"| {len(messages)} messages"
                )

            except Exception as e:
                transaction.savepoint_rollback(sid)
                skipped += 1
                self.stdout.write(
                    self.style.WARNING(f"  ~~ ERROR [{other_username}]: {e}")
                )

        # ── Group threads ──

        for group_title, participant_usernames, messages in groups:
            # Check all participants exist
            participant_users = []
            skip_group = False
            for uname in participant_usernames:
                u = User.objects.filter(username=uname, is_active=True).first()
                if not u:
                    self.stdout.write(self.style.WARNING(f"  ~~ SKIP GROUP: User '{uname}' not found"))
                    skip_group = True
                    break
                participant_users.append(u)
            if skip_group:
                skipped += 1
                continue

            sid = transaction.savepoint()
            try:
                thread = ChatThread.objects.create(thread_type=THREAD_TYPE_GROUP, title=group_title)
                ChatParticipant.objects.create(thread=thread, user=admin)
                for u in participant_users:
                    ChatParticipant.objects.create(thread=thread, user=u)

                for sender_username, body, minutes_ago in messages:
                    sender = admin if sender_username == "admin" else next(u for u in participant_users if u.username == sender_username)
                    created_at = now - timedelta(minutes=minutes_ago)
                    msg = ChatMessage.objects.create(thread=thread, sender=sender, body=body)
                    ChatMessage.objects.filter(id=msg.id).update(created_at=created_at)
                    created_messages += 1

                    # Add sample attachment to the quality report message
                    if group_title == "Quality Improvement Team" and minutes_ago == 2870:
                        ChatAttachment.objects.create(
                            message=msg,
                            file_url="/media/chat-attachments/q2_defect_chart_a9f3k2b8z4d1.png",
                            file_name="Q2_Defect_Pareto_Chart.png",
                            file_size=380928,
                            mime_type="image/png",
                        )
                    elif group_title == "Production Planning" and minutes_ago == 1425:
                        ChatAttachment.objects.create(
                            message=msg,
                            file_url="/media/chat-attachments/schedule_update_x7v2n9m4k1p8.pdf",
                            file_name="Adjusted_Production_Schedule.pdf",
                            file_size=438272,
                            mime_type="application/pdf",
                        )

                last_msg_created = now - timedelta(minutes=messages[-1][2])
                thread.last_message_at = last_msg_created
                thread.save(update_fields=["last_message_at", "updated_at"])

                ChatParticipant.objects.filter(thread=thread, user=admin).update(
                    last_read_at=last_msg_created - timedelta(minutes=5),
                )

                created_threads += 1

                users_str = ", ".join([admin.get_full_name() or admin.username] + [u.get_full_name() or u.username for u in participant_users])
                self.stdout.write(f"  [GRP] {group_title:30s} ({users_str}) | {len(messages)} messages")

            except Exception as e:
                transaction.savepoint_rollback(sid)
                skipped += 1
                self.stdout.write(self.style.WARNING(f"  ~~ ERROR GROUP [{group_title}]: {e}"))

        # Summary
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.SUCCESS("  SEED COMPLETE"))
        self.stdout.write("=" * 60)
        self.stdout.write(f"  Threads created:  {created_threads}")
        self.stdout.write(f"  Messages created: {created_messages}")
        if skipped:
            self.stdout.write(self.style.WARNING(f"  Skipped:         {skipped}"))
        total = ChatThread.objects.count()
        total_msgs = ChatMessage.objects.count()
        self.stdout.write(f"\n  Total threads:  {total}")
        self.stdout.write(f"  Total messages: {total_msgs}")
        self.stdout.write(self.style.SUCCESS("=" * 60))
