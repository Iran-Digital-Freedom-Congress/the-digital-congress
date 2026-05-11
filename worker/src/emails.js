// ─── Email Templates — Digital Iran Freedom Congress ───
//
// Three role-specific email templates sent after email verification.
// All role-specific emails are currently in Farsi (Persian).
//
// observerEmailHtml  — sent to observers (generic confirmation only, no second email)
// contributorEmailHtml — sent to contributors after email verification
// organiserEmailHtml   — sent to organisers after email verification

// ─── Shared wrapper ───
function emailWrap(bodyContent) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Inter',sans-serif;background:#F5F7FA;padding:40px 20px;margin:0;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <h1 style="font-size:18px;color:#1a1a2e;margin:0 0 24px;border-bottom:2px solid #e2e8f0;padding-bottom:16px;">
      ◆ کنگره‌ی دیجیتال آزادی ایران
    </h1>
    ${bodyContent}
    <p style="color:#94a3b8;font-size:12px;line-height:1.5;margin-top:32px;border-top:1px solid #e2e8f0;padding-top:16px;">
      در صورت هرگونه سؤال، لطفاً از راه ایمیل زیر با ما در تماس باشید:<br>
      <a href="mailto:Hi@DIFCongress.com" style="color:#3B82F6;">Hi@DIFCongress.com</a>
    </p>
    <p style="color:#94a3b8;font-size:12px;margin-top:8px;">با مهر،<br>تیم هماهنگی DIFC</p>
  </div>
</body>
</html>`;
}

// ─── Email 1: Generic verification (Observer / all roles, step 1) ───
export function verificationEmailHtml(verifyUrl) {
  return emailWrap(`
    <p style="color:#334155;font-size:15px;line-height:1.6;" dir="rtl">
      ممنون از علاقه‌مندی شما. لطفاً روی دکمه زیر کلیک کنید تا ایمیل شما تأیید و ثبت‌نام شما تکمیل شود.
    </p>
    <p style="color:#334155;font-size:15px;line-height:1.6;">
      Thank you for your interest in the congress. Please click the button below to confirm your email and complete your sign-up.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${verifyUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(87.63deg,#3B82F6 -1.41%,#0EA5E9 113.73%);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
        Confirm my participation / تأیید مشارکت من
      </a>
    </div>
    <p style="color:#94a3b8;font-size:13px;line-height:1.5;">
      If you didn't request this, you can safely ignore this email.<br>
      اگر شما این درخواست را ارسال نکردید، این ایمیل را نادیده بگیرید.
    </p>
  `);
}

// ─── Email 2a: Contributor — ZKP verification ───
export function contributorEmailHtml(zkpUrl, qrImageUrl) {
  return emailWrap(`
    <div dir="rtl" style="font-family:'Vazirmatn',sans-serif;color:#334155;font-size:15px;line-height:1.8;">
      <p>دوست عزیز،</p>
      <p>
        از اینکه در کنگره‌ی دیجیتال آزادی ایران به‌عنوان «مشارکت‌کننده» ثبت‌نام کرده‌اید، صمیمانه سپاسگزاریم.
        در این نقش، پس از پذیرش منشور رفتاری، شما می‌توانید در جلسات و بحث‌ها حضور فعال داشته باشید،
        و دیدگاه‌های خود را در فضای تعاملی کنگره به اشتراک بگذارید.
      </p>
      <p>
        لطفن ابتدا اپ جمهور را دانلود کنید و سپس جهت تایید هویت خود از راه سیستم ZKP،
        این QR Code را با دوربین موبایل اسکن کنید:
      </p>
      <div style="text-align:center;margin:24px 0;">
        <img src="${qrImageUrl}" alt="QR Code برای تایید هویت ZKP" width="200" height="200"
          style="border:1px solid #e2e8f0;border-radius:8px;padding:8px;background:#fff;">
        <p style="margin-top:12px;font-size:13px;color:#64748b;">
          یا روی لینک زیر کلیک کنید:<br>
          <a href="${zkpUrl}" style="color:#3B82F6;word-break:break-all;">${zkpUrl}</a>
        </p>
      </div>
      <p>
        پس از تکمیل فرآیند تایید هویت، ایمیل تایید نهایی برای شما ارسال خواهد شد و از آن پس
        با ایمیل خود می‌توانید در نقش مشارکت‌کننده در سیستم‌ها فعالیت کنید.
      </p>
      <p>
        درهای کنگره‌ی دیجیتال آزادی ایران همواره به روی افرادی که تمایل به مشارکت عمیق‌تر و ایفای نقش
        فعال‌تر در این حرکت دارند، باز است. در صورت تمایل، خوشحال خواهیم شد شما را در مسیر پیوستن به
        جمع سازمان‌دهندگان و همکاری نزدیک‌تر راهنمایی کنیم. ما به‌طور مستمر به افراد با مهارت‌های متنوع
        نیاز داریم تا در برگزاری رویدادهای دوره‌ای و پیشبرد فعالیت‌های کنگره، به هسته مرکزی هماهنگی
        یاری رسانند.
      </p>
    </div>
  `);
}

// ─── Email 2b: Organiser — ZKP + KYC ───
export function organiserEmailHtml(zkpUrl, qrImageUrl) {
  return emailWrap(`
    <div dir="rtl" style="font-family:'Vazirmatn',sans-serif;color:#334155;font-size:15px;line-height:1.8;">
      <p>دوست عزیز،</p>
      <p>
        از اینکه در کنگره‌ی دیجیتال آزادی ایران به‌عنوان «مشارکت‌کننده‌ی تایید شده» ثبت‌نام کرده‌اید،
        صمیمانه سپاسگزاریم. در این نقش، پس از پذیرش منشور رفتاری، شما می‌توانید در جلسات و بحث‌ها
        حضور فعال داشته باشید، دیدگاه‌های خود را در فضای تعاملی کنگره به اشتراک بگذارید، و همچنین
        به‌عنوان عضو تایید شده در مجمع عمومی کنگره و شورای هماهنگی، در فرآیندهای تصمیم‌سازی مهم
        و تاثیرگذار مشارکت نمایید.
      </p>
      <p>
        لطفن ابتدا اپ جمهور را دانلود کنید و سپس جهت تایید هویت خود از راه سیستم ZKP،
        این QR Code را با دوربین موبایل اسکن کنید:
      </p>
      <div style="text-align:center;margin:24px 0;">
        <img src="${qrImageUrl}" alt="QR Code برای تایید هویت ZKP" width="200" height="200"
          style="border:1px solid #e2e8f0;border-radius:8px;padding:8px;background:#fff;">
        <p style="margin-top:12px;font-size:13px;color:#64748b;">
          یا روی لینک زیر کلیک کنید:<br>
          <a href="${zkpUrl}" style="color:#3B82F6;word-break:break-all;">${zkpUrl}</a>
        </p>
      </div>
      <p>
        پس از تکمیل فرآیند تایید هویت، ایمیل تایید نهایی برای شما ارسال خواهد شد و از آن پس
        با ایمیل خود می‌توانید در نقش مشارکت‌کننده در سیستم‌ها فعالیت کنید.
      </p>
      <p>
        سپس باید فرایند KYC (Know Your Customer) را طی کنید. پس از دریافت تاییدیه در مرحله‌ی قبل،
        لینک جداگانه‌ای برای طی فرایند دوم دریافت خواهید کرد.
      </p>
      <p>
        توجه داشته باشید تمام اعضای تایید شده (بر پایه KYC) هر سه ماه یک‌بار، در ساعت ۱۸:۰۰ به وقت
        اروپای مرکزی (۲۰:۳۰ به وقت ایران)، در مجمع عمومی کنگره تشکیل جلسه می‌دهند. این زمان‌بندی
        به‌گونه‌ای در نظر گرفته شده است که امکان مشارکت ایرانیان داخل و خارج از کشور فراهم باشد.
        وظایف مجمع عمومی شامل انتخاب و عزل شورای هماهنگی، تصویب بودجه، و اصلاح اساسنامه
        (با اکثریت دو‌سوم آرا) است. حضور در حداقل دو جلسه از چهار جلسه فصلی، برای حفظ حق رای اعضا
        الزامی است.
      </p>
      <p>
        درهای کنگره‌ی دیجیتال آزادی ایران همواره به روی افرادی که تمایل به مشارکت عمیق‌تر و ایفای
        نقش فعال‌تر در این حرکت دارند، باز است. در صورت تمایل، خوشحال خواهیم شد شما را در مسیر
        پیوستن به جمع سازمان‌دهندگان و همکاری نزدیک‌تر راهنمایی کنیم.
      </p>
    </div>
  `);
}
