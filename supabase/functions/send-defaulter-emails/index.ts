import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Defaulter {
  roll_number: string;
  name: string;
  gender: string;
  attendance_percentage: number;
  student_email: string;
  parent_email: string;
}

interface RequestBody {
  defaulters: Defaulter[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { defaulters }: RequestBody = await req.json();

    if (!defaulters || !Array.isArray(defaulters) || defaulters.length === 0) {
      return new Response(
        JSON.stringify({ error: "No defaulters provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const emailPromises = defaulters.map(async (defaulter) => {
      const subject = "Attendance Alert - Low Attendance Warning";
      const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
            .stats { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Attendance Alert</h1>
            </div>
            <div class="content">
              <h2>Dear ${defaulter.name},</h2>
              <p>This is an important notification regarding your attendance record.</p>
              
              <div class="warning-box">
                <strong>⚠️ Low Attendance Warning</strong>
                <p>Your current attendance stands below the required threshold.</p>
              </div>
              
              <div class="stats">
                <h3>Your Attendance Details:</h3>
                <p><strong>Roll Number:</strong> ${defaulter.roll_number}</p>
                <p><strong>Current Attendance:</strong> <span style="color: #dc3545; font-size: 24px; font-weight: bold;">${defaulter.attendance_percentage.toFixed(2)}%</span></p>
                <p><strong>Required Minimum:</strong> 75%</p>
                <p style="color: #dc3545;"><strong>Status:</strong> Below Required Threshold</p>
              </div>
              
              <p>Students with attendance below 75% are considered defaulters and may face academic penalties including:</p>
              <ul>
                <li>Ineligibility for examinations</li>
                <li>Loss of internal assessment marks</li>
                <li>Academic probation</li>
                <li>Requirement for special permission to continue</li>
              </ul>
              
              <p><strong>Immediate Action Required:</strong></p>
              <ul>
                <li>Attend all upcoming classes regularly</li>
                <li>Meet with your academic advisor</li>
                <li>Submit medical certificates for any genuine absences</li>
                <li>Contact the administration for any concerns</li>
              </ul>
              
              <p>Please take this matter seriously and improve your attendance to avoid any academic consequences.</p>
              
              <div class="footer">
                <p>Regards,<br><strong>Attendance Monitoring Team</strong></p>
                <p style="margin-top: 20px;">This is an automated message. Please do not reply to this email.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      console.log(`Preparing to send email to: ${defaulter.student_email}`);
      console.log(`CC to parent: ${defaulter.parent_email}`);
      
      return {
        success: true,
        email: defaulter.student_email,
        message: `Email would be sent to ${defaulter.name} (${defaulter.student_email})`
      };
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter(r => r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        total: defaulters.length,
        results: results,
        message: `Email simulation completed for ${successCount} defaulters. In production, configure SMTP settings to send actual emails.`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});